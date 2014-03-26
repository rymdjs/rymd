(function() {

  // Reference to `window` in the browser and `exports`
  // on the server.
  var root = this;

  var Q = require('q'),
      Utils = require("rymd-utils"),
      ResourceStore = require('./ResourceStore'),
      Logger = require('rymd-logger');

  var logger = new Logger('RymdNode');

  var onshare  = function(peerName, data, connection) {
    logger.global(peerName + " wants to share some stuff");
    this.trigger('share', peerName, data, connection);
    this.store.saveAvailableResource(peerName, data);
  };

  //TODO: only save if the Resource has been requested before
  var onresource  = function(peerName, data, connection) {
    logger.global(peerName + " wants to send you data for resource " + data.data.guid);
    console.log(data);

    this.store.getResource(data.data.guid).then(function(resource) {
      resource.data = data.data.data;
      resource.hasData = true;
      logger.global('Saving resource', resource, data);
      this.store.saveResource(resource);
      return resource;
    }.bind(this))
    .then(function(resource) {
      this.trigger('resource', peerName, resource, connection);
    }.bind(this));
  };

  var onrequest = function(peerName, data, connection) {
    //TODO: Auth/identification dance
    logger.global(peerName + " wants to download " + data.guid);
    this.trigger('request', peerName, data, connection);
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
    this.network.on('resource', onresource.bind(this));
    this.network.on('share', onshare.bind(this));
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

      //TODO: registerendpoint. Race condition with onrequest and endpoint verification in onconnection?
      return this.network
        .init(identity)
        .then(startEndpointKeepalive.bind(this)); //TODO: registerendpoint
    };

    //TODO identity = String|RymdNode
    var connect = function(identity) {

      return this.verifier.lookupIdentity(identity).then(function(peer) {
        //TODO: Verify identity: Send challenge to other peer, let them sign challenge, verify with pubkey

        return this.network.connect(identity, peer.endpoints[Object.keys(peer.endpoints).pop()]).then(function(connection) {
          peer.connection = connection;
          this.peers[identity] = peer;

          peer.connection.on('resource', onresource.bind(this));
          logger.global('Opened connection to ' + identity);

          return peer.connection;

        }.bind(this));
      }.bind(this));
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
      var store = this.store;

      return this.connect(identity).then(function(connection) {
        return Q.all([
          store.getResource(guid),
          store.getResourceKey(guid)
        ])
        .spread(function(meta, key) {
          //TODO: confirm with other peer if share was successful?
          connection.shareResource(meta.metadata, key.data);
        });
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
