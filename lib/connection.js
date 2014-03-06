// initConnection.then(registerEndPoint).then(connectToPeers)
// new ConnectionHandler({ name: 'Niklas', endpoint: { host, port}, dht: 'http://ada:80' })
;(function() {

  // Reference to `window` in the browser and `exports`
  // on the server.
  var root = this;

  var Q = require('q');

  function Connection(options) {
    this.name = options.name;
    this.endpoint = options.endpoint;
    this.dht = options.dht;

    this.ondata = options.ondata || function() {};

    this.me = null;
    this.peerConnections = {};
  }

  // function to init connection to server
  Connection.prototype.connect = function() {
    var deferred = Q.defer();

    // connect to peerjs server, save the connection
    var peer = this.me = new Peer({ host: this.endpoint.host, port: this.endpoint.port });

    var connection = this;

    // gives us an id when connected
    peer.on('open', function(id) {
      registerEndPoint.call(connection, id);
      deferred.resolve();
    });

    peer.on('connection', function(peerConnection) {
      console.log('New connection', peerConnection);
      peerConnection.on('data', connection.ondata);
    });

    return deferred.promise;
  };

  function registerEndPoint(id) {
    var deferred = Q.defer();

    var endPointUrl = this.dht + '/identities/' + this.name + '/endpoints';

    var data = {
      id: id,
      host: this.endpoint.host,
      port: this.endpoint.port
    };

    var req = new XMLHttpRequest();
    req.open('PUT', endPointUrl);

    req.onload = function(e) {
      var res = this.response;
      if (this.status === 200) {
        deferred.resolve();
      }
    };

    req.send( JSON.stringify( data ) );

    return deferred.promise;
  }

  // function to init peer connection to peers, could potentially contain a callback for data retrieved
  Connection.prototype.connectToPeer = function(peer) {
    var deferred = Q.defer();
    var connection = this;

    var initConnection = function(endpoint) {
      // TODO, check if the endpoint are a different one from the one we are connected to
      connection.peerConnections[peer] = connection.me.connect(endpoint.id).on("open", function() {
        // TODO we need to listen for data on this end, retrieved from otherside etc
        deferred.resolve();
      });
    };

    getPeerEndPoint.call(this, peer).then(initConnection);

    return deferred.promise;
  };

  Connection.prototype.sendDataToPeer = function(peer, data) {
    var peerConnection = this.peerConnections[peer];

    if ( !peerConnection ) {
      // connect to peer, then call this function again
      this.connectToPeer(peer).then(this.sendDataToPeer.bind(this, peer, data));
      return;
    }
    peerConnection.send(data);
  };

  function getPeerEndPoint(peer) {
    var deferred = Q.defer();

    var endPointUrl = this.dht + '/identities/' + peer;

    var req = new XMLHttpRequest();
    req.open('GET', endPointUrl);

    req.onload = function(e) {
      var res = JSON.parse( this.response );
      if (this.status === 200) {
        var endpoints = res.endpoints;
        // TODO return several endpoints
        deferred.resolve( endpoints[ Object.keys(endpoints)[0] ] );
      }
    };

    req.send();

    return deferred.promise;
  }

  module.exports = root.Connection = Connection;

})();
