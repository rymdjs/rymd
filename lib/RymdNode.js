(function() {

  // Reference to `window` in the browser and `exports`
  // on the server.
  var root = this;

  var Q = require('q');

  //TODO: constructor should take a identity (String) 
  // and options object OR only options object
  function RymdNode(options) {
    this.network = options.network;
    this.verifier = options.verifier;

    this.network.oninit = this.verifier.verifyIdentity;
    this.peers = {};
  }

  var onPeerConnection = function() {
    //TODO: we need to listen for data on this end, retrieved from otherside etc
    console.log('opened connection');
  };

  RymdNode.prototype = function() {
    //TODO identity = String|RymdNode
    var connect = function(identity) {
      var deferred = Q.defer();
      this.verifier.lookupIdentity(identity).then(function(peer) {
        //TODO: Verify identity: Send challenge to other peer, let them sign challenge, verify with pubkey
        this.peers[identity] = peer;
        var connection = this.network.connect(identity, peer.endpoints[Object.keys[0]]);
        connection.on('open', onPeerConnection);
        peer.connection = connection;
        deferred.resolve(peer);
      });
      return deferred.promise;
    };

    var saveResource = function(data) {

    };

    var getResource = function(guid) {

    };

    return {
      connect: connect,
      saveResource: saveResource,
      getResource: getResource
    };
  }();

  module.exports = RymdNode;

})();
