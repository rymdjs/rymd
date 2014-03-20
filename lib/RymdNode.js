(function() {

  // Reference to `window` in the browser and `exports`
  // on the server.
  var root = this;

  var Q = require('q'),
      Utils = require("rymd-utils"),
      ResourceStore = require('./ResourceStore');

  var ondata = function(from, data) {
    // store metadata and key in "available store"
    console.log('A key a key, my kingdom for a key', data.key);
    this.store.saveAvailableResource(from, data);
    console.log('Data', data);
  };

  var onresource  = function(from, data) {
    console.log('New Resource data', data.data.data, data.data.guid);
    this.store.getResourceMetadata(data.guid).then(function(resource) {
      resource.data = data;
      resource.hasData = true;
      console.log('saving resource', resource, data);
      this.store.saveResource(resource);
    }.bind(this));

  };

  var onrequest = function(from, data) {
    //TODO: Auth/identification dance
    console.log('Someone be requesting that stuff!', this.peers, from);
    var connection = this.peers[from].connection;
    this.store.getResourceMetadata(data.guid, true).then(connection.sendResource.bind(connection));
  };

  var onconnection = function(connection) {
    console.log('onconnection', connection);
    this.verifier.lookupIdentity(connection.identity).then(function(peer) {
      //TODO: Verify identity: Send challenge to other peer, let them sign challenge, verify with pubkey
      peer.connection = connection;
      this.peers[connection.identity] = peer;
      console.log('new connection incoming from ', connection);
    }.bind(this));
  };

  //TODO: constructor should take a identity (String)
  // and options object OR only options object
  function RymdNode(options) {
    this.network = options.network;
    this.verifier = options.verifier;
    this.endpointKeepaliveInterval = options.endpointKeepaliveInterval;

    this.store = new ResourceStore(options.dataStore, options.crypto, options.stores);

    //this.network.oninit = this.verifier.verifyIdentity;
    this.peers = {};

    this.network.on('connection', onconnection.bind(this));
    this.network.on('request', onrequest.bind(this));
    this.network.on('data', ondata.bind(this));
    this.network.on('resource', onresource.bind(this));
  }

  var startEndpointKeepalive = function(endpoint) {
    var keepAlive = function() {
      return this.verifier.registerEndpoint(endpoint);
    }.bind(this);

    this._endpointKeepalive = setInterval(keepAlive, this.endpointKeepaliveInterval);
    return keepAlive();
  };

  RymdNode.prototype = function() {

    var isAlive = function() {
      return this.currentIdentity() !== null;
    };

    var currentIdentity = function() {
      return this.verifier.identity;
    };

    var init = function(identity) {
      this.verifier.identity = identity;
      console.log('starting init with identity ' + identity);

      //TODO: registerendpoint. Race condition with onrequest and endpoint verification in onconnection?
      return this.network.init(identity).then(startEndpointKeepalive.bind(this)); //TODO: registerendpoint
    };

    //TODO identity = String|RymdNode
    var connect = function(identity) {
      var deferred = Q.defer();

      this.verifier.lookupIdentity(identity).then(function(peer) {
        //TODO: Verify identity: Send challenge to other peer, let them sign challenge, verify with pubkey

        this.network.connect(identity, peer.endpoints[Object.keys(peer.endpoints)[0]]).then(function(connection) {
          peer.connection = connection;
          this.peers[identity] = peer;

          peer.connection.on("share", function() {
            console.log(arguments);
          });
          peer.connection.on('resource', onresource.bind(this));

          console.log('opened connection to ' + identity);
          deferred.resolve(connection);
        }.bind(this));
      }.bind(this));

      return deferred.promise;
    };

    var getConnection = function(identity) {
      var deferred = Q.defer(),
          peer = this.peers[identity];

      if (peer) {
        deferred.resolve(peer.connection);
        return deferred.promise;
      }

      return connect.call(this, identity);
    };

    var shareResource = function(guid, identity) {
      console.log('TODO: Share ' + guid + ' with ' + identity);
      var store = this.store;

      return this.connect(identity).then(function(connection) {
        return Q.all([
          store.getResourceMetaData(guid),
          store.getResourceKey(guid)
        ])
        .spread(function(meta, key) {
          //TODO: confirm with other peer if share was successful?
          connection.shareResource(meta.metadata, key.data);
        });
      });
    };

    var requestResource = function(guid) {
      var store = this.store;

      var sendReq = function(resource) {
        console.log('requesting resource', resource);
        var identity = resource.metadata.from;
        var guid = resource.metadata.id;

        // heard you like functions..
        var whenConnected = function() {
          var peer = this.peers[identity];
          console.log('Requesting ' + guid + ' from ' + identity);
          peer.connection.requestResource(guid);
        }.bind(this);

        getConnection.call(this, identity).then(whenConnected);

      }.bind(this);
      // find the file for the guid in available files
      store.getResourceMetadata(guid).then(sendReq);


      // when the file is found, check who sent it

      // send a req to network.request(guid. from)
    };

    return {
      init: init,
      isAlive: isAlive,
      currentIdentity: currentIdentity,
      connect: getConnection,
      shareResource: shareResource,
      requestResource: requestResource
    };
  }();

  // Use events
  Utils.extend(RymdNode.prototype, Utils.Events);

  module.exports = RymdNode;

})();
