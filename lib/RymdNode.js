(function() {

  // Reference to `window` in the browser and `exports`
  // on the server.
  var root = this;

  var Q = require('q');
  var ResourceStore = require('./ResourceStore');

  //TODO: constructor should take a identity (String)
  // and options object OR only options object
  function RymdNode(options) {
    this.network = options.network;
    this.verifier = options.verifier;
    this.endpointKeepaliveInterval = options.endpointKeepaliveInterval;

    this.store = new ResourceStore(options.dataStore, options.crypto, options.stores);

    //this.network.oninit = this.verifier.verifyIdentity;
    this.peers = {};
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

      var ondata = function(from, data) {
        // store metadata and key in "available store"
        console.log('A key a key, my kingdom for a key', data.key);
        this.store.saveAvailableResource(from, data);
        console.log('Data', data);
      }.bind(this);

      var onrequest = function(from, data) {
        //TODO: Auth/identification dance
        console.log('Someone be requesting that stuff!', this.peers, from);
        var connection = this.peers[from].connection;
        this.store.getResourceMetadata(data.guid, true).then(connection.sendResource.bind(connection));
      }.bind(this);

      var onconnection = function(peer, connection) {
        this.verifier.lookupIdentity(connection.identity).then(function(peer) {
          //TODO: Verify identity: Send challenge to other peer, let them sign challenge, verify with pubkey
          peer.connection = connection;
          this.peers[connection.identity] = peer;
          console.log('new connection incoming from ', connection);
        }.bind(this));
      }.bind(this);

      return this.network.init(identity, ondata, onrequest, onconnection).then(startEndpointKeepalive.bind(this)); //TODO: registerendpoint. Race condition with onrequest and endpoint verification in onconnection?
    };

    //TODO identity = String|RymdNode
    var connect = function(identity) {
      var deferred = Q.defer();
      this.verifier.lookupIdentity(identity).then(function(peer) {
        //TODO: Verify identity: Send challenge to other peer, let them sign challenge, verify with pubkey
        this.peers[identity] = peer;
        this.network.connect(identity, peer.endpoints[Object.keys(peer.endpoints)[0]]).then(function(connection) {
          peer.connection = connection;
          console.log('opened connection to ' + identity);
          deferred.resolve(connection);
        });
      }.bind(this));

      return deferred.promise;
    };

    var getConnection = function(identity) {
      var deferred = Q.defer();

      var peer = this.peers[identity];

      if (peer) {
        deferred.resolve(peer.connection);
      } else {
        this.connect(identity).then(function(connection) {
          deferred.resolve(connection);
        });
      }

      return deferred.promise;

    };

    var shareResource = function(guid, identity) {
      console.log('TODO: Share ' + guid + ' with ' + identity);

      var whenConnected = function() {
        var peer = this.peers[identity];
        var store = this.store;

        // get the metadata and key and pass to node?
        store.getResourceMetadata(guid).then(function(metaResource) {
          store.getResourceKey(guid).then(function(key) {
            // share metadata and key
            peer.connection.shareResource(metaResource.metadata, key.data);
          });
        })


        console.log('Connected, ready to share');
        console.log('Peeer', peer);
      }.bind(this);

      getConnection.call(this, identity).then(whenConnected);
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
          peer.connection.requestResource(guid);
        }.bind(this);

        getConnection.call(this, identity).then(whenConnected)

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
      connect: connect,
      shareResource: shareResource,
      requestResource: requestResource
    };
  }();

  module.exports = RymdNode;

})();
