(function() {

  // Reference to `window` in the browser and `exports`
  // on the server.
  var root = this;

  var Q = require('q'),
      Utils = require("rymd-utils"),
      ResourceStore = require('./ResourceStore'),
      Logger = require('rymd-logger');

  var logger = new Logger('RymdNode');

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
      //TODO: Auth/identification dance
      logger.global(peerName + " wants to download " + data.guid);
      this.store.getResource(data.guid, true).then(connection.sendResource.bind(connection));
    };

    var onConnection = function(connection) {
      console.log('onConnection', connection);
      this.verifier.lookupIdentity(connection.identity).then(function(peer) {
        //TODO: Verify identity: Send challenge to other peer, let them sign challenge, verify with pubkey
        peer.connection = connection;
        this.peers[connection.identity] = peer;
        console.log('new connection incoming from ', connection);
      }.bind(this));
    };

    var onAuthChallenge = function(peerName, data, connection) {
      //TODO: Only respond if this is a peer we want to be connected to.
      console.log('onAuthChallenge', peerName, new Uint8Array(data.data));
      var onAuthLastResponse = function() {
        console.log('onauthlastresponse', params);
      };

      var privKey;
      getPrivateKey.call(this).then(function(_privKey) {
        privKey = _privKey;
        return this.crypto.decryptData(privKey, new Uint8Array(data.data)).then(function(test) {
          console.log(new Uint8Array(test));
          return test;
        }).catch(function(error) {
          console.log('error');
          console.log(error);
        });
      }.bind(this))
      .then(function(data) {
        var dataView = new Uint8Array(data);
        var theirNonce = dataView.subarray(0, 16);
        var idView = dataView.subarray(16);
        var myNonce = window.crypto.getRandomValues(new Uint8Array(16));
        Utils.stringToArrayBuffer(peerName).then(function(peerNameBuf) {
          var peerNameView = new Uint8Array(peerNameBuf);
          for(var i = 0; i < peerNameBuf.byteLength; i++) {
            if(idView[i] !== peerNameView[i]) {
              logger.global('Authentication failed: Identities did not match!');
              console.log(peerNameView, idView);
              return;
            }
          }
          console.log(this);
          this.verifier.lookupIdentity(peerName).then(function(peer) {
            connection.on('authLastResponse', onAuthLastResponse);
            return this.crypto.importKey('public', 'encrypt', new Uint8Array(Utils.base64ToUint8Array(peer['rsa'].trim())));
          }.bind(this))
          .then(function(_theirPubKey) {
            theirPubKey = _theirPubKey;
            return Utils.stringToArrayBuffer(this.currentIdentity());
          }.bind(this))
          .then(function(idBuf) {
            //response = theirNonce : myNonce : myIdentity
            logger.global('D');
            var response = new Uint8Array(myNonce.byteLength + theirNonce.byteLength + idBuf.byteLength);
            response.set(theirNonce, 0);
            response.set(myNonce, theirNonce.byteLength);
            response.set(new Uint8Array(idBuf), myNonce.byteLength + theirNonce.byteLength);
            console.log(response);
            return this.crypto.encryptData(theirPubKey, response);
          }.bind(this))
          .then(function(authResponse) { return connection.sendAuthResponse(authResponse); })
          .catch(function(error) {
            console.log('error');
            console.log(error);
          });
        }.bind(this));
      }.bind(this));
    };

    var isAlive = function() {
      return this.currentIdentity() !== null;
    };

    var currentIdentity = function() {
      return this.verifier.identity;
    };

    var getPrivateKey = function() {
      //TODO: Real key storage
      var privKeys = {
        johannes: 'MIICeQIBADANBgkqhkiG9w0BAQEFAASCAmMwggJfAgEAAoGBAOpSXb05KoLox1ybOB8AIYzia1qFoGzkflySq4lV/0OveQq30Y9wdNEIuWH1HnykSLbfsmybSwhL+Fla6TfB8/zbKQJvM/muLGASs2685f9IGp+lWBODI3c35YuQqXvvirCw6Rzj5q6B7ny8ZqYqM1mdiAHy/pi3Ya3Ifrd8TouxAgMBAAECgYEA1p/y9Gr0IUwNrykNUnfQQzbwlc1nj9YKV8iQDg8S7HBBMiwEapnapcyT4MGf1xKy964Vw5zKMSNEqrO2gjfIvcVaIj7g5Et2OIdM7NaCTz/VduibI3Pfi5EquQf2tuckrEhpZqfgP622nzMxF8iLxEopVod/81K0nG/qlpuOgEECQQD4Ef/pn49HmEKj1VPK7zMgguOaW6n0SGB8f7X78a1P8aPlUDtm7PY1kR5cBdKgfPHLNS3bOoym3dcCG5MMxSqlAkEA8c/cFY8UbF4oiCR0a6W+e0M7J9LSrZDVqsXZL5hWsVuXBHJZY20bXezljxnMWWd4qte/OfmZc+qWUy1LVmMrHQJBAOXHvnWHX69ggPHCq1ABSyllNDAJkh59YCpSHZ6WmQPA/yBstek7uz+ZATcaCaSwt0OUKbq0vA3g1MTWB9q/UyUCQQC7nDi2JVeEKJ2r2xTUfDjIa8YWxLQeY7PTFkPGcJw6aMRHd+ywfnNwMR9+Ilbwup3ddxxvf582VzigehDsim5lAkEAniRw0dYsMoNiWQyfSKQpRwNej7HEeiGtfAdZZzIykXEoT2Fg4S0uoPuWNbdNmI7DTZwK3Qwlmev+SV8dczsxMg==',
        robert: 'MIIEowIBAAKCAQEAt+pT1I2ZSC3OeBUIkL3HtqvfZo7n61UYxYnUxKs83S+4T1sR1WJxNh6VNUhRv4ft16+9baiA6GjWnQagj2CHKPmPDqWY8xfCvelhEbpAHPalvm1Z6YDAtx08+it1WucYZsc8NAlz8ZTcVM60V0zUqb23839HmV7Y9+LpVBbO42vN/roT1d4yTTzT5590xFCVgNtoZlfGHAEJmGVEjhP7KN/a1fNxTnrIo4UUmU2ZZskZ30VWpWLW/cbWwQuS21qjNdUirBoL2BvWzW3TyjB6PDyn4wgR9yw+KrG+DKOQQcvz+DgfCdGgTBQqlsdSSoIYskdoDPiCEVuT/GwdiXSKLwIDAQABAoIBAHOzQeus7OpAjuxyZwIPsi1UMOWnL3WYAk57aFQVWePYWn3pz+1K0ef3E20CwxLYI6OV1ni/EeGj2qfMfIPWeREo9nuDaBY+M3Af+sYZQq416I1E49SHADXyeeL0Jg765Rn7av9dlwg62uWraD6ngf4K8UeJIfT1e09u+9S/yIW+wHl1RL4jhtJYuxWNWhALQntRvvs9OGsn6NQgQLgKj8WfjfG57yUPQ4xdTCTfL1IpKRFqxTR7UYtVfXLd4JAx7HoGZwx7tVjYBY1P6Cba+Nxl6kVNOEyYuQhvML1HrP8dk/frwk/m2yRMJcz8lilPBKTkEc96GJXwsWgEpdZlN/kCgYEA81RRpOfPUI7vDPROtmOdIPdE0vxsIEHe3AuT4rleLbjNqf99hJYVVCVLeWp++NU8t85oMK7KSkQsJmPdPeRw2jKdIrcfGpS9/xBzJXcfxm+XK/R9Ql0p8JwP3Rr/JOjhpgtfPnSOMAqHlPv1rYFQo10Pr9YE2bOfWFy3h953ql0CgYEAwX3+tr/cHyWr6AGv4j1f7oUtoi4Uuu4YGCDG5U8xCChAz/KCKfMQkKRLcsWtQF+GHdXaOEqUHbzCIZlu6U1nl5/vHZNd2A52MvSvfZiSDGPpISINBuobmgQ7zeDxbjrNnG51zS5s3bxwtekXB+RWu4qGjcCqrJHPb5Wb33IUdfsCgYBfNW/YsWc54yOAExu1W9bAbl/8mg4ItR1pRhJwVQ2XoEbArJpFRaBE027rrBLQdEcUuGumGM5ILtKDlvGbZQYPKly3l6VQ9kA9TAdx8mF5eHJTHY/hZqihX78JSaXpoEGigbKbsmlsPMJ+NfQUFpQhx6j6qSgusoy3u1eIjzCNdQKBgEQGyQN1Jq2or+yMk0qmK1EPb4DCVLV3ue7ZrzO1iNaGWGsDprGa7Cr+KCx8xTGJo/xfUC5UQgjGcTYg3HaXqSEMsKOkSO0KAJJfpkcw2cATbEYi05OnwPaAIIp8WEVZ1Sn3R+FQPiQi+TlrbpZut/ONe0rg/uBXDyf64GdJk1n7AoGBAOPjwwZm6fLjhI4RPC8ZCxHJ8KVkGeaF7UKwWw90q8M0Rh3iaFqJ1ulPWZs/73NwQEBIlyh8vYIVQ5c3bkYiYVONBuYUa2lUqPiSVkwua2pof5IPQaxC2o5w0B2dZGdzXyMP0xaEJmNZDyrH7CFcxzFV6KbM7pLqVSSwe2gVYM5s'
      };
      var keyString = privKeys[this.currentIdentity()];
      return this.crypto.importKey('private', 'encrypt', new Uint8Array(Utils.base64ToUint8Array(keyString)));
    };

    var init = function(identity) {
      this.verifier.identity = identity;
      this.network.on('connection', onConnection.bind(this));
      this.network.on('request', onRequest.bind(this));
      this.network.on('resource', onResource.bind(this));
      this.network.on('share', onShare.bind(this));
      this.network.on('authChallenge', onAuthChallenge.bind(this));
      logger.global('Starting init with identity: ' + identity);

      //TODO: registerendpoint. Race condition with onRequest and endpoint verification in onConnection?
      return this.network
        .init(identity)
        .then(startEndpointKeepalive.bind(this)); //TODO: registerendpoint
    };


    //TODO identity = String|RymdNode
    var connect = function(identity) {
      var deferred = Q.defer();
      var connection;
      var myNonce;

      var onAuthResponse = function(peerName, data, connection) {
        //data = enc(myNonce : theirNonce : peerName)
        var privKey;
        getPrivateKey.call(this).then(function(_privKey) {
          privKey = _privKey;
          console.log('privkey');
          return this.crypto.decryptData(privKey, new Uint8Array(data));
        }.bind(this))
        .then(function(dataView) {
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
          peer.connection.on('request', onRequest.bind(this));
          peer.connection.on('resource', onResource.bind(this));
          peer.connection.on('share', onShare.bind(this));
          logger.global('Opened connection to ' + peerName);
          deferred.resolve(connection);
        }.bind(this));
      }.bind(this))
      .catch(function(error) {
        console.log('error');
        console.log(error);
      });
    };

    this.verifier.lookupIdentity(identity).then(function(peer) {
      this.network.connect(identity, peer.endpoints[Object.keys(peer.endpoints).pop()]).then(function(_connection) {
        logger.global('a');
        logger.global(peer['rsa'].trim());
        connection = _connection;
        return this.crypto.importKey('public', 'encrypt', new Uint8Array(Utils.base64ToUint8Array(peer['rsa'].trim())));
      }.bind(this))
      .then(function(_theirPubKey) {
        logger.global('b');
        theirPubKey = _theirPubKey;
        myNonce = window.crypto.getRandomValues(new Uint8Array(16));
        return Utils.stringToArrayBuffer(this.currentIdentity());
      }.bind(this))
      .then(function(idBuf) {
        //challenge = nonce : myIdentity
        var challenge = new Uint8Array(myNonce.byteLength + idBuf.byteLength);
        challenge.set(myNonce, 0);
        challenge.set(new Uint8Array(idBuf), myNonce.byteLength);
        console.log('c', theirPubKey, challenge);
        return this.crypto.encryptData(theirPubKey, challenge);
      }.bind(this))
      .then(function(authChallenge) {
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
