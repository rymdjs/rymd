(function() {

  // Reference to `window` in the browser and `exports`
  // on the server.
  var root = this;

  var Q = require('q');

  function RymdNode(identity, options) {
    this.network = options.network;
    this.verifier = options.verifier;

    //this.network.oninit = this.verifier.verifyIdentity;
    this.peers = {};
  }

  RymdNode.prototype = function() {
    var init = function(identity) {
      this.verifier.identity = identity;
      return this.network.init().then(this.verifier.registerEndpoint.bind(this.verifier)); //TODO: registerendpoint
    };

    var connect = function(identity) {
      var deferred = Q.defer();
      this.verifier.lookupIdentity(identity).then(function(peer) {
        //TODO: Verify identity: Send challenge to other peer, let them sign challenge, verify with pubkey
        console.log('verified identity');
        this.peers[identity] = peer;
        var connection = this.network.connect(identity, peer.endpoints[Object.keys[0]]);
        peer.connection = connection;
        connection.on('open', function() {
          console.log('opened connection');
          deferred.resolve(connection);
        });
      }.bind(this));
      return deferred.promise;
    };

    var saveResource = function(data) {

    };

    var getResource = function(guid) {

    };

    return {
      init: init,
      connect: connect,
      saveResource: saveResource,
      getResource: getResource
    };
  }();

  module.exports = RymdNode;

})();
