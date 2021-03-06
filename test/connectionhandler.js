var should = chai.should();

describe("ConnectionHandler", function() {

  var Utils = RymdUtils,
      ConnectionHandler = RymdConnectionHandler,
      Logger = RymdLogger,
      AUTH_NONCE_LENGTH = 16;

  var logger = new Logger('connectionhandlertest');

  var firstChallenge = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 97, 108, 105, 99, 101], //[0], alice
      firstResponse = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 98, 111, 98], //[0], [0], bob
      lastResponse = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]; //[1]
  var alice = {},
      bob = {},
      crypto;

  beforeEach(function(done) {
    var peers = {};
    crypto = RymdCrypto;
    alice.network = new Peer({peers: peers});
    alice.verifier = new DHT.Verifier();
    alice.verifier.identity = 'alice';
    bob.network = new Peer({peers: peers});
    bob.verifier = new DHT.Verifier();
    bob.verifier.identity = 'bob';
    Q.all([
      crypto.importKey('private', 'encrypt', new Uint8Array(Utils.base64ToUint8Array('MIICeQIBADANBgkqhkiG9w0BAQEFAASCAmMwggJfAgEAAoGBAOpSXb05KoLox1ybOB8AIYzia1qFoGzkflySq4lV/0OveQq30Y9wdNEIuWH1HnykSLbfsmybSwhL+Fla6TfB8/zbKQJvM/muLGASs2685f9IGp+lWBODI3c35YuQqXvvirCw6Rzj5q6B7ny8ZqYqM1mdiAHy/pi3Ya3Ifrd8TouxAgMBAAECgYEA1p/y9Gr0IUwNrykNUnfQQzbwlc1nj9YKV8iQDg8S7HBBMiwEapnapcyT4MGf1xKy964Vw5zKMSNEqrO2gjfIvcVaIj7g5Et2OIdM7NaCTz/VduibI3Pfi5EquQf2tuckrEhpZqfgP622nzMxF8iLxEopVod/81K0nG/qlpuOgEECQQD4Ef/pn49HmEKj1VPK7zMgguOaW6n0SGB8f7X78a1P8aPlUDtm7PY1kR5cBdKgfPHLNS3bOoym3dcCG5MMxSqlAkEA8c/cFY8UbF4oiCR0a6W+e0M7J9LSrZDVqsXZL5hWsVuXBHJZY20bXezljxnMWWd4qte/OfmZc+qWUy1LVmMrHQJBAOXHvnWHX69ggPHCq1ABSyllNDAJkh59YCpSHZ6WmQPA/yBstek7uz+ZATcaCaSwt0OUKbq0vA3g1MTWB9q/UyUCQQC7nDi2JVeEKJ2r2xTUfDjIa8YWxLQeY7PTFkPGcJw6aMRHd+ywfnNwMR9+Ilbwup3ddxxvf582VzigehDsim5lAkEAniRw0dYsMoNiWQyfSKQpRwNej7HEeiGtfAdZZzIykXEoT2Fg4S0uoPuWNbdNmI7DTZwK3Qwlmev+SV8dczsxMg=='))),
      crypto.importKey('private', 'encrypt', new Uint8Array(Utils.base64ToUint8Array('MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC36lPUjZlILc54FQiQvce2q99mjufrVRjFidTEqzzdL7hPWxHVYnE2HpU1SFG/h+3Xr71tqIDoaNadBqCPYIco+Y8OpZjzF8K96WERukAc9qW+bVnpgMC3HTz6K3Va5xhmxzw0CXPxlNxUzrRXTNSpvbfzf0eZXtj34ulUFs7ja83+uhPV3jJNPNPnn3TEUJWA22hmV8YcAQmYZUSOE/so39rV83FOesijhRSZTZlmyRnfRValYtb9xtbBC5LbWqM11SKsGgvYG9bNbdPKMHo8PKfjCBH3LD4qsb4Mo5BBy/P4OB8J0aBMFCqWx1JKghiyR2gM+IIRW5P8bB2JdIovAgMBAAECggEAc7NB66zs6kCO7HJnAg+yLVQw5acvdZgCTntoVBVZ49hafenP7UrR5/cTbQLDEtgjo5XWeL8R4aPap8x8g9Z5ESj2e4NoFj4zcB/6xhlCrjXojUTj1IcANfJ54vQmDvrlGftq/12XCDra5atoPqeB/grxR4kh9PV7T2771L/Ihb7AeXVEviOG0li7FY1aEAtCe1G++z04ayfo1CBAuAqPxZ+N8bnvJQ9DjF1MJN8vUikpEWrFNHtRi1V9ct3gkDHsegZnDHu1WNgFjU/oJtr43GXqRU04TJi5CG8wvUes/x2T9+vCT+bbJEwlzPyWKU8EpOQRz3oYlfCxaASl1mU3+QKBgQDzVFGk589Qju8M9E62Y50g90TS/GwgQd7cC5PiuV4tuM2p/32ElhVUJUt5an741Ty3zmgwrspKRCwmY9095HDaMp0itx8alL3/EHMldx/Gb5cr9H1CXSnwnA/dGv8k6OGmC18+dI4wCoeU+/WtgVCjXQ+v1gTZs59YXLeH3neqXQKBgQDBff62v9wfJavoAa/iPV/uhS2iLhS67hgYIMblTzEIKEDP8oIp8xCQpEtyxa1AX4Yd1do4SpQdvMIhmW7pTWeXn+8dk13YDnYy9K99mJIMY+khIg0G6huaBDvN4PFuOs2cbnXNLmzdvHC16RcH5Fa7ioaNwKqskc9vlZvfchR1+wKBgF81b9ixZznjI4ATG7Vb1sBuX/yaDgi1HWlGEnBVDZegRsCsmkVFoETTbuusEtB0RxS4a6YYzkgu0oOW8ZtlBg8qXLeXpVD2QD1MB3HyYXl4clMdj+FmqKFfvwlJpemgQaKBspuyaWw8wn419BQWlCHHqPqpKC6yjLe7V4iPMI11AoGARAbJA3Umraiv7IyTSqYrUQ9vgMJUtXe57tmvM7WI1oZYawOmsZrsKv4oLHzFMYmj/F9QLlRCCMZxNiDcdpepIQywo6RI7QoAkl+mRzDZwBNsRiLTk6fA9oAginxYRVnVKfdH4VA+JCL5OWtulm638417SuD+4FcPJ/rgZ0mTWfsCgYEA4+PDBmbp8uOEjhE8LxkLEcnwpWQZ5oXtQrBbD3SrwzRGHeJoWonW6U9Zmz/vc3BAQEiXKHy9ghVDlzduRiJhU40G5hRraVSo+JJWTC5ramh/kg9BrELajnDQHZ1kZ3NfIw/TFoQmY1kPKsfsIVzHMVXopszukupVJLB7aBVgzmw='))),
      crypto.importKey('public', 'encrypt', new Uint8Array(Utils.base64ToUint8Array('MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDqUl29OSqC6MdcmzgfACGM4mtahaBs5H5ckquJVf9Dr3kKt9GPcHTRCLlh9R58pEi237Jsm0sIS/hZWuk3wfP82ykCbzP5rixgErNuvOX/SBqfpVgTgyN3N+WLkKl774qwsOkc4+auge58vGamKjNZnYgB8v6Yt2GtyH63fE6LsQIDAQAB'))),
      crypto.importKey('public', 'encrypt', new Uint8Array(Utils.base64ToUint8Array('MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAt+pT1I2ZSC3OeBUIkL3HtqvfZo7n61UYxYnUxKs83S+4T1sR1WJxNh6VNUhRv4ft16+9baiA6GjWnQagj2CHKPmPDqWY8xfCvelhEbpAHPalvm1Z6YDAtx08+it1WucYZsc8NAlz8ZTcVM60V0zUqb23839HmV7Y9+LpVBbO42vN/roT1d4yTTzT5590xFCVgNtoZlfGHAEJmGVEjhP7KN/a1fNxTnrIo4UUmU2ZZskZ30VWpWLW/cbWwQuS21qjNdUirBoL2BvWzW3TyjB6PDyn4wgR9yw+KrG+DKOQQcvz+DgfCdGgTBQqlsdSSoIYskdoDPiCEVuT/GwdiXSKLwIDAQAB')))
    ]).spread(function(alicePrivKey, bobPrivKey, alicePubKey, bobPubKey) {
      alice.privKey = alicePrivKey;
      bob.privKey = bobPrivKey;
      alice.pubKey = alicePubKey;
      bob.pubKey = bobPubKey;
      alice.connectionHandler = new ConnectionHandler({
        network: alice.network,
        verifier: alice.verifier,
        crypto: crypto,
        privKey: alicePrivKey,
        pubKey: alicePubKey
      });
      bob.connectionHandler = new ConnectionHandler({
        network: bob.network,
        verifier: bob.verifier,
        crypto: crypto,
        privKey: bobPrivKey,
        pubKey: bobPubKey
      });
      alice.network.init('alice').then(bob.network.init('bob')).then(function() {
        done();
      });
    });
  });

  describe('Authentication', function() {
    afterEach(function() {
      if(typeof window.crypto.getRandomValues.restore === 'function') {
        window.crypto.getRandomValues.restore();
      }
    });
    //Fills array with given value
    var stubRandom = function(val) {
      return function(arr) {
          for(var i=0; i<arr.length; i++) {
            arr[i] = val;
          }
          return arr;
        }
    };
    describe('Initial auth challenge', function() {
      it('should give correct challenge', function(done) {
        sinon.stub(window.crypto, 'getRandomValues', stubRandom(0));
        bob.network.on('authChallenge', function(peerName, data) {
          if(peerName !== 'alice') {
            done(new Error('incorrect peer name '+peerName));
          }
          return crypto.decryptData(bob.privKey, new Uint8Array(data.data)).then(function(result) {
            var resultView = new Uint8Array(result);
            if(resultView.length !== firstChallenge.length) {
              done(new Error('incorrect first response length'));
            }
            for(var i=0; i<firstChallenge.length; i++) {
              if (resultView[i] !== firstChallenge[i]) {
                done(new Error('incorrect first response data'));
              }
            }
            done();
          });
        });

        alice.connectionHandler.connect('bob');
      });
    });

    describe('First auth response', function() {
      it('should reject incorrect identity', function(done) {
        crypto.encryptData(alice.pubKey, new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 97, 108, 106])).then(function(encResponse) { //[0], [0], alj
          sinon.stub(window.crypto, 'getRandomValues', stubRandom(0));
          bob.network.on('authChallenge', function(peerName, data, connection) {
            sinon.stub(connection, 'sendAuthResponse', function() {
              logger.global('Sending crypto response with invalid identity to ' + this.identity);
              this.peer.trigger('data', {type: 'authResponse', data: encResponse});  //[0], aljce
            })
          });
          bob.network.on('authChallenge', bob.connectionHandler.onAuthChallenge.bind(bob.connectionHandler));
          alice.network.on('authResponseError', function(error) {
            if(error.message === 'Authentication failed: Identities did not match!') {
              done();
            } else {
              done('Did not reject idetity properly. Error message: ' + error.message);
            }
          });
          alice.connectionHandler.connect('bob');
        });
      });
      it('should reject incorrect nonce', function(done) {
        crypto.encryptData(alice.pubKey, new Uint8Array([1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 98, 111, 98])).then(function(encResponse) { //[0], [0], bob
          sinon.stub(window.crypto, 'getRandomValues', stubRandom(0));
          bob.network.on('authChallenge', function(peerName, data, connection) {
            sinon.stub(connection, 'sendAuthResponse', function() {
              logger.global('Sending crypto response with incorrect nonce to ' + this.identity);
              this.peer.trigger('data', {type: 'authResponse', data: encResponse});  //[0], aljce
            })
          });
          bob.network.on('authChallenge', bob.connectionHandler.onAuthChallenge.bind(bob.connectionHandler));
          alice.network.on('authResponseError', function(error) {
            if(error.message === 'Authentication failed: Response nonce did not match!') {
              done();
            } else {
              done('Did not reject idetity properly. Error message: ' + error.message);
            }
          });
          alice.connectionHandler.connect('bob');
        });
      });
      it('should be properly formatted', function(done) {
        sinon.stub(window.crypto, 'getRandomValues', stubRandom(0));
        bob.network.on('authChallenge', function() {
          window.crypto.getRandomValues.restore();
          sinon.stub(window.crypto, 'getRandomValues', stubRandom(1));
          bob.connectionHandler.onAuthChallenge.apply(bob.connectionHandler, arguments);
        });
        alice.network.on('authResponseError', function(error) {
          console.log('authResponseError', error);
        });
        alice.network.on('authResponse', function(peerName, data) {
          if(peerName !== 'bob') {
            done(new Error('incorrect peer name '+peerName));
          }
          return crypto.decryptData(alice.privKey, new Uint8Array(data.data)).then(function(result) {
            var resultView = new Uint8Array(result);
            if(resultView.length !== firstResponse.length) {
              done(new Error('incorrect first response length'));
            }
            for(var i=0; i<firstResponse.length; i++) {
              if (resultView[i] !== firstResponse[i]) {
                done(new Error('incorrect first response data'));
              }
            }
            done();
          });
        });

        alice.connectionHandler.connect('bob').then(function() {
        });
      });
    });
    describe('Second  auth response', function() {
      it('should reject incorrect nonce', function(done) {
        crypto.encryptData(bob.pubKey, new Uint8Array([0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1])).then(function(encResponse) { //[1]
          sinon.stub(window.crypto, 'getRandomValues', stubRandom(1));
          alice.network.on('authResponse', function(peerName, data, connection) {
            sinon.stub(connection, 'sendAuthLastResponse', function() {
              logger.global('Sending crypto last response with incorrect nonce to ' + this.identity);
              this.peer.trigger('data', {type: 'authLastResponse', data: encResponse});  //[1]
            })
          });
          bob.network.on('authChallenge', bob.connectionHandler.onAuthChallenge.bind(bob.connectionHandler));
          bob.network.on('authLastResponseError', function(error) {
            if(error.message === 'Authentication failed: Response nonce did not match!') {
              done();
            } else {
              done('Did not reject nonce properly. Error message: ' + error.message);
            }
          });
          alice.connectionHandler.connect('bob');
        });
      });

      it('should be properly formatted', function(done) {
        sinon.stub(window.crypto, 'getRandomValues', stubRandom(0));
        bob.network.on('authChallenge', function() {
          window.crypto.getRandomValues.restore();
          sinon.stub(window.crypto, 'getRandomValues', stubRandom(1));
          bob.connectionHandler.onAuthChallenge.apply(bob.connectionHandler, arguments);
        });
        bob.network.on('authLastResponseError', function(error) {
          console.log('authLastResponseError', error);
        });
        bob.network.on('authLastResponse', function(peerName, data) {
          if(peerName !== 'alice') {
            done(new Error('incorrect peer name '+peerName));
          }
          return crypto.decryptData(bob.privKey, new Uint8Array(data.data)).then(function(result) {
            var resultView = new Uint8Array(result);
            if(resultView.length !== lastResponse.length) {
              done(new Error('incorrect last response length'));
            }
            for(var i=0; i<lastResponse.length; i++) {
              if (resultView[i] !== lastResponse[i]) {
                done(new Error('incorrect last response data'));
              }
            }
            done();
          });
        });

        alice.connectionHandler.connect('bob').then(function() {
        });
      });
    });
  });
});

