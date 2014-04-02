(function() {

  var Utils = RymdUtils,
      Logger = RymdLogger;

  var logger = new Logger('Peer');

  function Peer(options) {
    this.options = options;
    this.endpoint = null;
    this.identity = null;

    this._peers = options.peers;
  }

  Peer.prototype = function() {
    var init = function(identity) {
      var deferred = Q.defer();

      this.identity = identity;
      this.endpoint = identity + 'Endpoint';
      this._peers[this.endpoint] = this;
      this.on('connection', function(peer) {
        var connection = new Connection(peer, this);
        this.bubble('share', connection);
        this.bubble('request', connection);
        this.bubble('authChallenge', connection);
        this.bubble('authLastResponse', connection);
        logger.global("Incoming connection: " + connection.identity);
      }.bind(this));
      deferred.resolve(this.endpoint);
      return deferred.promise;
    }

    var connect = function(identity, endpoint) {
      var deferred = Q.defer(),
          peer = this._peers[endpoint.id],
          connection = new Connection(peer, this);
      this.bubble('request', connection);
      this.bubble('authResponse', connection);
      peer.trigger('connection', this);
      logger.global('Connected to ' + identity);
      deferred.resolve(connection);
      return deferred.promise;
    }
    return {
      init: init,
      connect: connect
    };
  }();

  this.Peer = Peer;

  Utils.extend(Peer.prototype, Utils.Events);

}).call(this);
