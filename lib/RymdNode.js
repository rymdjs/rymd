(function() {

  // Reference to `window` in the browser and `exports`
  // on the server.
  var root = this;

  var Q = require('q'),
      Utils = require("rymd-utils"),
      ResourceStore = require('./ResourceStore'),
      ConnectionHandler = require('./ConnectionHandler'),
      Logger = require('rymd-logger');

  var logger = new Logger('RymdNode');

  var onConnectionAuthenticated = function(peer) {
    this.peers[peer.id] = peer;
    peer.connection.on('request', onRequest.bind(this));
    peer.connection.on('resource', onResource.bind(this));
    peer.connection.on('share', onShare.bind(this));
    logger.global('Opened connection to ' + peer.id);
    return peer.connection;
  };

  var onShare  = function(peerName, data, connection) {
    logger.global(peerName + " wants to share some stuff");
    this.store.saveAvailableResource(peerName, data).then(function() {
      this.trigger('share', peerName, data, connection);
    }.bind(this));
  };

  var onSession = function(){

  }

  //TODO: only save if the Resource has been requested before
  var onResource  = function(peerName, data) {
    logger.global(peerName + ' sent you data for resource ' + data.data.guid);
    var resource;
    this.store.getResource(data.data.guid).then(function(_resource) {
      resource = _resource;
      resource.hasData = true;
      resource.data = data.data.data;
      logger.global('Saving resource');
      return this.store.saveResource(resource);
    }.bind(this))
    .then(function() {
      this.trigger('resource', peerName, resource);
    }.bind(this));
  };

  var onRequest = function(peerName, data, connection) {
    //TODO: Auth/identification dance
    logger.global(peerName + " wants to download " + data.guid);
    this.trigger('request', peerName, data, connection);
  };

  //TODO: constructor should take a identity (String)
  // and options object OR only options object
  function RymdNode(options) {
    this.network = options.network;
    this.verifier = options.verifier;
    this.crypto = options.crypto;
    this.endpointKeepaliveInterval = options.endpointKeepaliveInterval;
    this.store = new ResourceStore(options.dataStore, options.crypto, options.stores);
    this.peers = {};
    onSession();

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

    var setPrivateKey = function(key, identity) {
      return this.store.setPrivateKey(key, identity);
    };

    var getPrivateKey = function(identity, purpose) {
       return this.store.getPrivateKey(identity, purpose);
    };

    var getPublicKey = function(identity) {
      return this.verifier.lookupIdentity(identity).then(function(peer) {
        if(typeof peer['rsa'] === 'undefined') {
          throw new Error('No valid key assigned with the identity ' + identity + '.');
        }

        return peer.rsa.trim();
      });
    };

    var currentIdentity = function() {
      return this.verifier.identity;
    };

    var init = function(identity) {
      this.verifier.identity = identity;

      logger.global('Starting init with identity: ' + identity);

      //TODO: registerendpoint. Race condition with onRequest and endpoint verification in onConnection?
      return Q.all([
        this.network.init(identity).then(startEndpointKeepalive.bind(this))
        ,
        this.getPrivateKey(identity).then(function(privKey) {
          connectionHandler = new ConnectionHandler({
            network: this.network,
            verifier: this.verifier,
            crypto: this.crypto,
            privKey: privKey
          });

          connectionHandler.on('connectionAuthenticated', onConnectionAuthenticated.bind(this));
          this.connectionHandler = connectionHandler;
          this.network.on('authChallenge', this.connectionHandler.onAuthChallenge.bind(this.connectionHandler));

        }.bind(this))
        .catch(function(err) {
          console.error(err.message);
        })
      ]).then(function() {
        logger.global('Initialized with identity: ' + identity);
        this.trigger('init', identity);
      }.bind(this));
    };

    var connect = function(peerName) {
      return this.connectionHandler.connect(peerName);
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
      return Q.all([
        this.connect(identity),
        this.store.getResource(guid),
        this.store.getResourceKey(guid)
      ])
      .spread(function(connection, meta, key) {
        //TODO: confirm with other peer if share was successful?
        connection.shareResource(meta.metadata, key.data);
      });
    };

    var requestResource = function(guid) {
      return this.store.getResource(guid)
      .then(function(resource) {
        return resource.metadata.from;
      })
      .then(this.connect.bind(this))
      .then(function(connection) {
        return connection.requestResource(guid);
      });
    };

    var destroyResource = function(guid) {
      return this.store.getResource(guid, false)
        .then(this.store.destroyResource.bind(this.store));
    };

    return {
      init: init,
      isAlive: isAlive,
      setPrivateKey: setPrivateKey,
      getPrivateKey: getPrivateKey,
      getPublicKey: getPublicKey,
      currentIdentity: currentIdentity,
      connect: getConnection,
      shareResource: shareResource,
      requestResource: requestResource,
      destroyResource: destroyResource
    };
  }();

  // Use events
  Utils.extend(RymdNode.prototype, Utils.Events);

  module.exports = RymdNode;

})();
