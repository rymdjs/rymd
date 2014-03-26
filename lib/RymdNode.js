(function() {

  // Reference to `window` in the browser and `exports`
  // on the server.
  var root = this;

  var Q = require('q'),
      Utils = require("rymd-utils"),
      ResourceStore = require('./ResourceStore'),
      Logger = require('rymd-logger');

  var logger = new Logger('RymdNode');
  var AUTH_NONCE_LENGTH = 16;

  var privKeys = {
    johannes: 'MIICeQIBADANBgkqhkiG9w0BAQEFAASCAmMwggJfAgEAAoGBAOpSXb05KoLox1ybOB8AIYzia1qFoGzkflySq4lV/0OveQq30Y9wdNEIuWH1HnykSLbfsmybSwhL+Fla6TfB8/zbKQJvM/muLGASs2685f9IGp+lWBODI3c35YuQqXvvirCw6Rzj5q6B7ny8ZqYqM1mdiAHy/pi3Ya3Ifrd8TouxAgMBAAECgYEA1p/y9Gr0IUwNrykNUnfQQzbwlc1nj9YKV8iQDg8S7HBBMiwEapnapcyT4MGf1xKy964Vw5zKMSNEqrO2gjfIvcVaIj7g5Et2OIdM7NaCTz/VduibI3Pfi5EquQf2tuckrEhpZqfgP622nzMxF8iLxEopVod/81K0nG/qlpuOgEECQQD4Ef/pn49HmEKj1VPK7zMgguOaW6n0SGB8f7X78a1P8aPlUDtm7PY1kR5cBdKgfPHLNS3bOoym3dcCG5MMxSqlAkEA8c/cFY8UbF4oiCR0a6W+e0M7J9LSrZDVqsXZL5hWsVuXBHJZY20bXezljxnMWWd4qte/OfmZc+qWUy1LVmMrHQJBAOXHvnWHX69ggPHCq1ABSyllNDAJkh59YCpSHZ6WmQPA/yBstek7uz+ZATcaCaSwt0OUKbq0vA3g1MTWB9q/UyUCQQC7nDi2JVeEKJ2r2xTUfDjIa8YWxLQeY7PTFkPGcJw6aMRHd+ywfnNwMR9+Ilbwup3ddxxvf582VzigehDsim5lAkEAniRw0dYsMoNiWQyfSKQpRwNej7HEeiGtfAdZZzIykXEoT2Fg4S0uoPuWNbdNmI7DTZwK3Qwlmev+SV8dczsxMg==',
    robert: 'MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC36lPUjZlILc54FQiQvce2q99mjufrVRjFidTEqzzdL7hPWxHVYnE2HpU1SFG/h+3Xr71tqIDoaNadBqCPYIco+Y8OpZjzF8K96WERukAc9qW+bVnpgMC3HTz6K3Va5xhmxzw0CXPxlNxUzrRXTNSpvbfzf0eZXtj34ulUFs7ja83+uhPV3jJNPNPnn3TEUJWA22hmV8YcAQmYZUSOE/so39rV83FOesijhRSZTZlmyRnfRValYtb9xtbBC5LbWqM11SKsGgvYG9bNbdPKMHo8PKfjCBH3LD4qsb4Mo5BBy/P4OB8J0aBMFCqWx1JKghiyR2gM+IIRW5P8bB2JdIovAgMBAAECggEAc7NB66zs6kCO7HJnAg+yLVQw5acvdZgCTntoVBVZ49hafenP7UrR5/cTbQLDEtgjo5XWeL8R4aPap8x8g9Z5ESj2e4NoFj4zcB/6xhlCrjXojUTj1IcANfJ54vQmDvrlGftq/12XCDra5atoPqeB/grxR4kh9PV7T2771L/Ihb7AeXVEviOG0li7FY1aEAtCe1G++z04ayfo1CBAuAqPxZ+N8bnvJQ9DjF1MJN8vUikpEWrFNHtRi1V9ct3gkDHsegZnDHu1WNgFjU/oJtr43GXqRU04TJi5CG8wvUes/x2T9+vCT+bbJEwlzPyWKU8EpOQRz3oYlfCxaASl1mU3+QKBgQDzVFGk589Qju8M9E62Y50g90TS/GwgQd7cC5PiuV4tuM2p/32ElhVUJUt5an741Ty3zmgwrspKRCwmY9095HDaMp0itx8alL3/EHMldx/Gb5cr9H1CXSnwnA/dGv8k6OGmC18+dI4wCoeU+/WtgVCjXQ+v1gTZs59YXLeH3neqXQKBgQDBff62v9wfJavoAa/iPV/uhS2iLhS67hgYIMblTzEIKEDP8oIp8xCQpEtyxa1AX4Yd1do4SpQdvMIhmW7pTWeXn+8dk13YDnYy9K99mJIMY+khIg0G6huaBDvN4PFuOs2cbnXNLmzdvHC16RcH5Fa7ioaNwKqskc9vlZvfchR1+wKBgF81b9ixZznjI4ATG7Vb1sBuX/yaDgi1HWlGEnBVDZegRsCsmkVFoETTbuusEtB0RxS4a6YYzkgu0oOW8ZtlBg8qXLeXpVD2QD1MB3HyYXl4clMdj+FmqKFfvwlJpemgQaKBspuyaWw8wn419BQWlCHHqPqpKC6yjLe7V4iPMI11AoGARAbJA3Umraiv7IyTSqYrUQ9vgMJUtXe57tmvM7WI1oZYawOmsZrsKv4oLHzFMYmj/F9QLlRCCMZxNiDcdpepIQywo6RI7QoAkl+mRzDZwBNsRiLTk6fA9oAginxYRVnVKfdH4VA+JCL5OWtulm638417SuD+4FcPJ/rgZ0mTWfsCgYEA4+PDBmbp8uOEjhE8LxkLEcnwpWQZ5oXtQrBbD3SrwzRGHeJoWonW6U9Zmz/vc3BAQEiXKHy9ghVDlzduRiJhU40G5hRraVSo+JJWTC5ramh/kg9BrELajnDQHZ1kZ3NfIw/TFoQmY1kPKsfsIVzHMVXopszukupVJLB7aBVgzmw=',
    robin: 'MIICeQIBADANBgkqhkiG9w0BAQEFAASCAmMwggJfAgEAAoGBAKyEUkNDsFl7fyMmOMV49mXG7RyV5x6qb53AlGxwjW2/cb6sT1hWZkZHJFr+pPfCY6sPtHMAb/ZNLzhHS5f74gsMqmxKmMVc9p3ukX5nCQQbsfhQT9oCkDYsRaBaAkGF26vEkYKKs1obr4k6rir959jmAqKN0pj2nmLOHjVK5dVxAgMBAAECgYEAoROfV2yxEKutZp0+bqrlrNvS8ljIhipusuVn7+QbOTiCNJzgLMPnFIFCYa/XSfn3Y3Xzb1keMOOaTjrLSyoEv/Ch79fJr17QeorVQU3Crs+TR7S139phvyrKRDy9Ir2lrH8BxiennqJcO7OF/zNNrZiHzCca+nm4IhidW+w3J60CQQDj/+qSyKeN9uNx08ABN8CkhMr5NSfVbNC3cZFVdySUY19lk9cJA6Mespu4VyjF+9b6iGrT7W47KgE3KXzHA2AbAkEAwbQUvoNN8osqxj1qLVr3DgZiqRnQqUsIqVBzPqgTAyGlhFqLsUngONsuswjI0nPt+tV2u14FXYrUz9Wlkb+xYwJBAJ3H12Q22cUjqqh1+jSdiYIQp4ooH+XRhOq9++5iIf1Se40G71O8oaC3x42dO4kvS8laqFr6v0LQQcETw9bRXisCQQCsYOe9CvjJCZQNSwY8SqFld8VBG1oX7lBM7O1CKyyQMtcrS7DZGxdRQazzYrPkpYp5GJJK98bqkewE8OohJGhlAkEAuu3vUWYN7i5nrbRYoNpYGO8jwQLDRpJvFrHR78VYMUZFQLh6tTgX7okDDzTHtiu5a+95o6rYQZQVe3SOOfVQZQ=='
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

    var onShare  = function(peerName, data, connection) {
      logger.global(peerName + " wants to share some stuff");
      this.store.saveAvailableResource(peerName, data);
    };

    //TODO: only save if the Resource has been requested before
    var onResource  = function(peerName, data) {
      logger.global(peerName + " wants to send you data for resource " + data.data.guid);
      console.log('New Resource data', data.data.data, data.data.guid);
      this.store.getResource(data.data.guid).then(function(resource) {
        resource.data = data.data.data;
        resource.hasData = true;
        console.log('saving resource', resource, data);
        return this.store.saveResource(resource);
      }.bind(this));
    };

    var onRequest = function(peerName, data, connection) {
      logger.global(peerName + " wants to download " + data.guid);
      this.store.getResource(data.guid, true).then(connection.sendResource.bind(connection));
    };

    var onAuthChallenge = function(peerName, data, connection) {
      //TODO: Only respond if this is a peer we want to be connected to.
      var onAuthLastResponse;
      var myNonce = window.crypto.getRandomValues(new Uint8Array(AUTH_NONCE_LENGTH));
      return Q.all([
        getPrivateKey.call(this),
        this.verifier.lookupIdentity(peerName)
      ])
      .spread(function(privKey, peer) {
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
            connection.on('request', onRequest.bind(this));
            connection.on('resource', onResource.bind(this));
            connection.on('share', onShare.bind(this));
            peer.connection = connection;
            this.peers[connection.identity] = peer;
            console.log('new connection established and verified from ', connection);
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

    var isAlive = function() {
      return this.currentIdentity() !== null;
    };

    var currentIdentity = function() {
      return this.verifier.identity;
    };

    var getPrivateKey = function() {
      //TODO: Real key storage
      var keyString = privKeys[this.currentIdentity()];
      return this.crypto.importKey('private', 'encrypt', new Uint8Array(Utils.base64ToUint8Array(keyString)));
    };

    var init = function(identity) {
      this.verifier.identity = identity;
      this.network.on('authChallenge', onAuthChallenge.bind(this));
      logger.global('Starting init with identity: ' + identity);

      //TODO: registerendpoint. Race condition with onRequest and endpoint verification in onConnection?
      return this.network
        .init(identity)
        .then(startEndpointKeepalive.bind(this));
    };


    //TODO identity = String|RymdNode
    var connect = function(identity) {
      var deferred = Q.defer();
      var connection;
      var myNonce;

      this.verifier.lookupIdentity(identity).then(function(peer) {
        var onAuthResponse = function(peerName, data, connection) {
          //data = enc(myNonce : theirNonce : peerName)
          var privKey;
          getPrivateKey.call(this).then(function(_privKey) {
            privKey = _privKey;
            return this.crypto.decryptData(privKey, new Uint8Array(data.data));
          }.bind(this))
          .then(function(dataBuf) {
            var dataView = new Uint8Array(dataBuf);
            var responseMyNonce = dataView.subarray(0, myNonce.byteLength);
            var theirNonce = dataView.subarray(myNonce.byteLength, myNonce.byteLength*2);
            var idView = dataView.subarray(myNonce.byteLength*2);
            for(var i = 0; i < myNonce.byteLength; i++) {
              if(myNonce[i] !== responseMyNonce[i]) {
                logger.global('Authentication failed: Response nonce did not match!');
                console.log(myNonce, responseMyNonce);
                return;
              }
            }
            return Utils.stringToArrayBuffer(identity).then(function(identityBuf) {
              var identityView = new Uint8Array(identityBuf);
              for(var i = 0; i < identityBuf.byteLength; i++) {
                if(idView[i] !== identityView[i]) {
                  logger.global('Authentication failed: Identities did not match!');
                  console.log(identityView, idView);
                  return;
                }
              }
              connection.on('request', onRequest.bind(this));
              connection.on('resource', onResource.bind(this));
              connection.on('share', onShare.bind(this));
              // response = enc(theirNonce)
              return this.crypto.encryptData(theirPubKey, new Uint8Array(theirNonce)).then(function(encTheirNonceBuf) {
                return connection.sendAuthLastResponse(new Uint8Array(encTheirNonceBuf));
              }.bind(this))
              .then(function() {
                //Auth done, setup connection
                peer.connection = connection;
                this.peers[identity] = peer;
                logger.global('Opened connection to ' +identity);
                deferred.resolve(connection);
              }.bind(this));
            }.bind(this));
          }.bind(this))
          .catch(function(error) {
            console.log('error');
            console.log(error);
          });
        };
        this.network.connect(identity, peer.endpoints[Object.keys(peer.endpoints).pop()]).then(function(_connection) {
          connection = _connection;
          if(typeof peer['rsa'] === 'undefined') {
            throw new Error('No valid key assigned with the identity ' + identity + '.');
          }
          return this.crypto.importKey('public', 'encrypt', new Uint8Array(Utils.base64ToUint8Array(peer['rsa'].trim())));
        }.bind(this))
        .then(function(_theirPubKey) {
          theirPubKey = _theirPubKey;
          myNonce = window.crypto.getRandomValues(new Uint8Array(16));
          return Utils.stringToArrayBuffer(this.currentIdentity());
        }.bind(this))
        .then(function(idBuf) {
          //challenge = nonce : myIdentity
          var challenge = new Uint8Array(myNonce.byteLength + idBuf.byteLength);
          challenge.set(myNonce, 0);
          challenge.set(new Uint8Array(idBuf), myNonce.byteLength);
          return this.crypto.encryptData(theirPubKey, challenge);
        }.bind(this))
        .then(function(authChallenge) {
          console.log('this', this)
          connection.on('authResponse', onAuthResponse.bind(this));
          return connection.sendAuthChallenge(new Uint8Array(authChallenge));
        }.bind(this));
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
