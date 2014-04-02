(function() {

  var Utils = RymdUtils,
      Logger = RymdLogger;

  var logger = new Logger('Connection');

  function Connection(otherPeer, thisPeer) {
    this.identity = otherPeer.identity;
    this.peer = otherPeer;
    thisPeer.on('data', ondata.bind(this));
  }

  var send = function(data) {
    this.peer.trigger('data', data);
  };

  var ondata = function(data) {
    console.log('Incoming data', data, this);
    if ( !data.type ) return;
    var from = this.identity;
    this.trigger(data.type, from, data, this);
  };

  Connection.prototype = function() {

    var shareResource = function(metadata, key) {
      logger.global('Sharing resource: ' + metadata.guid);
      send.call(this, { type: 'share', metadata: metadata, key: key });
    };

    var sendResource = function(resource) {
      logger.global('Sending resource: ' + resource.id);
      send.call(this, { type: 'resource', metadata: resource.metadata, data: resource.data });
    };

    var requestResource = function(guid) {
      logger.global('Requesting resource: ' + guid);
      send.call(this, { type: 'request', guid: guid });
    };

    var sendAuthChallenge = function(encNonce) {
      logger.global('Sending crypto challenge to ' + this.identity);
      send.call(this, {type: 'authChallenge', data: encNonce});
    };

    var sendAuthResponse = function(response) {
      logger.global('Sending crypto response to ' + this.identity);
      send.call(this, {type: 'authResponse', data: response});
    };

    var sendAuthLastResponse = function(response) {
      logger.global('Sending crypto lastResponse to ' + this.identity);
      send.call(this, {type: 'authLastResponse', data: response});
    };

    var establish = function() {
      logger.global('Sending auth establish to ' + this.identity);
      send.call(this, {type: 'authEstablish'});
    };

    return {
      sendResource: sendResource,
      shareResource: shareResource,
      requestResource: requestResource,
      sendAuthChallenge: sendAuthChallenge,
      sendAuthResponse: sendAuthResponse,
      sendAuthLastResponse: sendAuthLastResponse,
      establish: establish
    };
  }();

  // Use events
  Utils.extend(Connection.prototype, Utils.Events);

  this.Connection = Connection;

}).call(this);
