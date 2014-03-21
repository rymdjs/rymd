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
    this.crypto = options.crypto;
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
      var deferred = Q.defer();
      var connection;
      var myNonce;

      var onChallengeResponse = function(peerName, data, connection) {
        //data = enc(myNonce : theirNonce : peerName)
        var dataView = new Uint8Array(data);
        this.crypto.decryptData(getPrivateKey(), data).then(function() {
          var responseMyNonce = dataView.subArray(0, myNonce.byteLength);
          var theirNonce = dataView.subArray(myNonce.byteLength, myNonce.byteLength*2);
          var idBuf = dataView.subArray(myNonce.byteLength*2);
          for(var i = 0; i < myNonce.byteLength; i++) {
            if(myNonce[i] !== responseMyNonce[i]) {
              logger.global('Authentication failed: Response nonce did not match!');
              console.log(myNonce, responseMyNonce);
              return;
            }
          }
          Utils.stringToArrayBuffer(peerName).then(function(peerNameBuf) {
          for(var i = 0; i < peerNameBuf.byteLength; i++) {
            if(idBuf[i] !== peerNameBuf[i]) {
              logger.global('Authentication failed: Identities did not match!');
              console.log(peerNameBuf, idBuf);
              return;
            }
          }
          var encTheirNonce = new Uint8Array(theirNonce.byteLength);
          this.crypto.encryptData(theirPubKey, encTheirNonce);

          //Auth done, setup connection
          peer.connection = connection;
          this.peers[identity] = peer;

          peer.connection.on('resource', onresource.bind(this));
          peer.connection.on('share', onshare.bind(this));
          logger.global('Opened connection to ' + peerName);
          deferred.resolve(connection);
        }.bind(this));
      }.bind(this));
    };

  //Funkar att importera
  //var testPubKey = "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDbm/OeNgnAxBX8EpcC5u3u7dQTh4qiTeykFL3s4JtF4Uzj9dwqOujsQ5K5a5VGF/jtB1RSURd+sSJDpasTfgD3kRFxheJJj8SsInLYQPX+vehQozX6TFX2n844fdpjdfafYI30j0Cd+OXmS6Lk+2oVsfHl1j7Q519RlSgrzDZ9gwIDAQAB";
    //funkar ej att importera
  var testPubKey = "AAAB3NzaC1yc2EAAAADAQABAAABAQDYpCdw7PWoM8kt639vSvxzVH5sXRMmlK+n1IXmf8JFKw91kVfxlC/Wl+3NFY3vE+iL95hVAKZTxe0HuLemKl9CWRd4/xoTeb839YDi72FVZYWjePWeQE+ECc+FWhrzNG2kz5/P4Vwd4Be3RQo99aBV4zpMAQcyjZegt1/Rfn6FVgVyOUrCKIyf0ohaH6mnZESJ4earozkBya56z+YUHn8Zi8/Rtq0VaKJrFjGOxIyq0DdUpxVX4wp4ZeYWGbWpbfJToVU2gFWNaBfGBa9ACi/xNypX/2R10ia7fwmQz8Lmho+A/WSZv5IUxdCmlKrAgKLzO+Ub67XcnUDz81VrMbQb";

    this.verifier.lookupIdentity(identity).then(function(peer) {
      this.network.connect(identity, peer.endpoints[Object.keys(peer.endpoints).pop()]).then(function(_connection) {
        logger.global('a');
        console.log(peer, peer['ssh-rsa'].length);
        console.log(testPubKey, testPubKey.length);
        connection = _connection;
        connection.on('challengeResponse', onChallengeResponse);
        //return this.crypto.importKey('public', 'encrypt', new Uint8Array(Utils.base64ToUint8Array(peer['ssh-rsa'].trim())));
        return this.crypto.importKey('public', 'encrypt', new Uint8Array(Utils.base64ToUint8Array(testPubKey)));
      }.bind(this))
      .then(function(_theirPubKey) {
        logger.global('b');
        theirPubKey = _theirPubKey;
        myNonce = window.crypto.getRandomValues(new Uint8Array(16));
        return Utils.stringToArrayBuffer(this.currentIdentity());
      }.bind(this))
      .then(function(idBuf) {
        logger.global('c');
        var challenge = new Uint8Array(myNonce.byteLength + idBuf.byteLength);
        challenge.set(myNonce, 0);
        challenge.set(new Uint8Array(idBuf), myNonce.byteLength);
        return this.crypto.encryptData(theirPubKey, challenge);
      }.bind(this))
      .then(function(authChallenge) { return connection.sendAuthChallenge(authChallenge); });

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
