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
      var deferred = Q.defer();
      this.verifier.identity = identity;
      console.log('starting init with identity ' + identity);
      return this.network.init().then(startEndpointKeepalive.bind(this)); //TODO: registerendpoint
      return deferred.promise;
    };

    //TODO identity = String|RymdNode
    var connect = function(identity) {
      var deferred = Q.defer();
      this.verifier.lookupIdentity(identity).then(function(peer) {
        //TODO: Verify identity: Send challenge to other peer, let them sign challenge, verify with pubkey
        this.peers[identity] = peer;
        this.network.connect(identity, peer.endpoints[Object.keys(peer.endpoints, 0)]).then(function(connection) {
          peer.connection = connection;
          console.log('opened connection to ' + identity);
          deferred.resolve(connection);
        });
      }.bind(this));

      return deferred.promise;
    };


    var shareResource = function(guid, identity) {
      var peer = this.peers[identity];
      console.log('TODO: Share ' + guid + ' with ' + identity);
      var whenConnected = function() {
        console.log('Connected, ready to share');
      }.bind(this);
      if(this.peers[identity]) {
        whenConnected();
      } else {
        this.connect(identity).then(whenConnected);
      }

    };

    return {
      init: init,
      isAlive: isAlive,
      currentIdentity: currentIdentity,
      connect: connect,
      shareResource: shareResource
    };
  }();

  module.exports = RymdNode;

})();
