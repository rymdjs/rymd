(function() {

  // Reference to `window` in the browser and `exports`
  // on the server.
  var root = this;

  var Q = require('q'),
      Utils = require("rymd-utils"),
      ResourceStore = require('./ResourceStore'),
      Logger = require('rymd-logger');

  var logger = new Logger('RymdNode');

  //TODO: constructor should take a identity (String)
  // and options object OR only options object
  function RymdNode(options) {
    this.network = options.network;
    this.verifier = options.verifier;
    this.endpointKeepaliveInterval = options.endpointKeepaliveInterval;

    this.store = new ResourceStore(options.dataStore, options.crypto, options.stores);

    //this.network.oninit = this.verifier.verifyIdentity;
    this.peers = {};

    //TODO
    this.network.on('share', function(peerName, data) {
      logger.global(peerName + " wants to share some stuff");
      console.log(data);

      this.store.saveAvailableResource(peerName, data);
    }.bind(this));

    this.network.on('request', function(peerName, data, connection) {
      logger.global(peerName + " wants to download " + data.guid);

      this.store.getResource(data.guid).then(connection.sendResource);

    }.bind(this));

    this.network.on('resource', function(peerName, data, connection) {
      logger.global(peerName + " wants to send you data");
      console.log(data);

      //TODO: only save if the Resource has been requested before
    }.bind(this));

    logger.separator();
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
      logger.global('Starting init with identity: ' + identity);

      return this.network
        .init(identity)
        .then(startEndpointKeepalive.bind(this)); //TODO: registerendpoint
    };

    //TODO identity = String|RymdNode
    var connect = function(identity) {
      var deferred = Q.defer();

      this.verifier.lookupIdentity(identity).then(function(peer) {
        //TODO: Verify identity: Send challenge to other peer, let them sign challenge, verify with pubkey

        this.network.connect(identity, peer.endpoints[Object.keys(peer.endpoints).pop()]).then(function(connection) {
          peer.connection = connection;
          this.peers[identity] = peer;
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
          peer.connection.requestResource(guid);
        }.bind(this);

        getConnection.call(this, identity).then(whenConnected)

      }.bind(this);
      // find the file for the guid in available files
      store.getResourceMetaData(guid).then(sendReq);


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
