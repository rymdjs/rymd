(function() {

  // Reference to `window` in the browser and `exports`
  // on the server.
  var root = this;

  var Q = require('q'),
      Utils = require("rymd-utils"),
      Logger = require('rymd-logger');

  var logger = new Logger('ConnectionHandler');
  var AUTH_NONCE_LENGTH = 16;

  function ConnectionHandler(options) {
    var privKey = options.privKey;

    this.network = options.network;
    this.verifier = options.verifier;
    this.crypto = options.crypto;

    this.connect = function(peerName) {
      var deferred = Q.defer(),
          myNonce = window.crypto.getRandomValues(new Uint8Array(AUTH_NONCE_LENGTH)),
          peer,
          onAuthResponse;

      this.verifier.lookupIdentity(peerName)
      .then(function(_peer) {
        peer = _peer;
        if(typeof peer['rsa'] === 'undefined') {
          throw new Error('No valid key assigned with the identity ' + peerName + '.');
        }
        return [
          this.crypto.importKey('public', 'encrypt', new Uint8Array(Utils.base64ToUint8Array(peer['rsa'].trim()))),
          Utils.stringToArrayBuffer(this.currentIdentity())
        ];
      }.bind(this))
      .spread(function(theirPubKey, myIdBuf) {

        onAuthResponse = function(peerName, data, connection) {
          //data = enc(myNonce : theirNonce : peerName)
          Q.all([
            this.crypto.decryptData(privKey, new Uint8Array(data.data)),
            Utils.stringToArrayBuffer(peerName)
          ])
          .spread(function(dataBuf, peerNameBuf) {
            var dataView = new Uint8Array(dataBuf),
                responseMyNonce = dataView.subarray(0, myNonce.byteLength),
                theirNonce = dataView.subarray(myNonce.byteLength, myNonce.byteLength*2),
                idView = dataView.subarray(myNonce.byteLength*2),
                peerNameView = new Uint8Array(peerNameBuf);
            if(myNonce.length !== responseMyNonce.length) {
              throw new Error('Authentication failed: Response nonce length did not match!');
            }
            for(var i = 0; i < myNonce.length; i++) {
              if(myNonce[i] !== responseMyNonce[i]) {
                throw new Error('Authentication failed: Response nonce did not match!');
              }
            }
            if(idView.length !== peerNameView.length) {
              throw new Error('Authentication failed: Identity length did not match!');
            }
            for(var i = 0; i < idView.length; i++) {
              if(idView[i] !== peerNameView[i]) {
                throw new Error('Authentication failed: Identities did not match!');
              }
            }
            connection.verified = true;
            logger.global('Connection verified to ' + connection.identity);
            // response = enc(theirNonce)
            return this.crypto.encryptData(theirPubKey, new Uint8Array(theirNonce));
          }.bind(this))
          .then(function(encTheirNonceBuf) {
            connection.on('authEstablish', function() {
              logger.global('Connection established and verified to ' + connection.identity);
              //Auth done, setup connection
              peer.connection = connection;
              this.trigger('connectionAuthenticated', peer);
              deferred.resolve(connection);
            }.bind(this));
            return connection.sendAuthLastResponse(new Uint8Array(encTheirNonceBuf));
          }.bind(this))
          .catch(function(error) {
            console.log('error');
            console.log(error);
          });
        };

        //challenge = nonce : myIdentity
        var challenge = new Uint8Array(myNonce.byteLength + myIdBuf.byteLength);
        challenge.set(myNonce, 0);
        challenge.set(new Uint8Array(myIdBuf), myNonce.byteLength);
        return [
          this.network.connect(peerName, peer.endpoints[Object.keys(peer.endpoints).pop()]),
          this.crypto.encryptData(theirPubKey, challenge)
        ];
      }.bind(this))
      .spread(function(connection, authChallenge) {
        connection.on('authResponse', onAuthResponse.bind(this));
        return connection.sendAuthChallenge(new Uint8Array(authChallenge));
      }.bind(this));

      return deferred.promise;
    };

    this.onAuthChallenge = function(peerName, data, connection) {
      //TODO: Only respond if this is a peer we want to be connected to.
      var onAuthLastResponse;
      var myNonce = window.crypto.getRandomValues(new Uint8Array(AUTH_NONCE_LENGTH));
      return this.verifier.lookupIdentity(peerName)
      .then(function(peer) {
         onAuthLastResponse = function(peerName, data) {
          return this.crypto.decryptData(privKey, new Uint8Array(data.data)).then(function(responseMyNonceBuf) {
            var responseMyNonce = new Uint8Array(responseMyNonceBuf);
            if(myNonce.length !== responseMyNonce.length) {
              throw new Error('Authentication failed: Response nonce length did not match!');
            }
            for(var i = 0; i < responseMyNonce.length; i++) {
              if(myNonce[i] !== responseMyNonce[i]) {
                throw new Error('Authentication failed: Response nonce did not match!');
              }
            }
            connection.verified = true;
            peer.connection = connection;
            this.trigger('connectionAuthenticated', peer);
            return connection.establish();
            logger.global('New connection established and verified from ' + connection.identity);
          }.bind(this))
          .catch(function(error) {
            throw error;
          });
        };

        if(typeof peer['rsa'] === 'undefined') {
          throw new Error('No valid key assigned with the identity ' + peerName + '.');
        }
        return Q.all([
          this.crypto.decryptData(privKey, new Uint8Array(data.data)),
          this.crypto.importKey('public', 'encrypt', new Uint8Array(Utils.base64ToUint8Array(peer['rsa'].trim()))),
          Utils.stringToArrayBuffer(this.currentIdentity()),
          Utils.stringToArrayBuffer(peerName)
        ]);
      }.bind(this))
      .spread(function(data, theirPubKey, myIdBuf, peerNameBuf) {
        var dataView = new Uint8Array(data),
            theirNonce = dataView.subarray(0, AUTH_NONCE_LENGTH),
            theirIdView = dataView.subarray(AUTH_NONCE_LENGTH),
            peerNameView = new Uint8Array(peerNameBuf);
        if(peerNameView.length !== theirIdView.length) {
          throw new Error('Authentication failed: Identities length did not match!');
        }
        for(var i = 0; i < peerNameView.length; i++) {
          if(theirIdView[i] !== peerNameView[i]) {
            throw new Error('Authentication failed: Identities did not match!');
          }
        }
        connection.on('authLastResponse', onAuthLastResponse.bind(this));
        //response = theirNonce : myNonce : myIdentity
        var response = new Uint8Array(myNonce.byteLength + theirNonce.byteLength + myIdBuf.byteLength);
        response.set(theirNonce, 0);
        response.set(myNonce, theirNonce.byteLength);
        response.set(new Uint8Array(myIdBuf), myNonce.byteLength + theirNonce.byteLength);
        return this.crypto.encryptData(theirPubKey, response);
      }.bind(this))
      .then(function(authResponse) {
        return connection.sendAuthResponse(authResponse);
      }.bind(this))
      .catch(function(error) {
        throw error;
      });
    };
  }

  ConnectionHandler.prototype = function() {

    var currentIdentity = function() {
      return this.verifier.identity;
    };

    return {
      currentIdentity: currentIdentity
    };
  }();

  //Use events
  Utils.extend(ConnectionHandler.prototype, Utils.Events);

  module.exports = ConnectionHandler;

})();
