var should = chai.should();

describe("ConnectionHandler", function() {

  var Utils = RymdUtils,
      ConnectionHandler = RymdConnectionHandler,
      AUTH_NONCE_LENGTH = 16;

  var firstResponse = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 97, 108, 105, 99, 101], //[0], alice
      secondChallenge = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 97, 108, 105, 99, 101]; //[0], alice
  var alice = {},
      bob = {},
      crypto;

  before(function(done) {
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
      crypto.importKey('private', 'encrypt', new Uint8Array(Utils.base64ToUint8Array('MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC36lPUjZlILc54FQiQvce2q99mjufrVRjFidTEqzzdL7hPWxHVYnE2HpU1SFG/h+3Xr71tqIDoaNadBqCPYIco+Y8OpZjzF8K96WERukAc9qW+bVnpgMC3HTz6K3Va5xhmxzw0CXPxlNxUzrRXTNSpvbfzf0eZXtj34ulUFs7ja83+uhPV3jJNPNPnn3TEUJWA22hmV8YcAQmYZUSOE/so39rV83FOesijhRSZTZlmyRnfRValYtb9xtbBC5LbWqM11SKsGgvYG9bNbdPKMHo8PKfjCBH3LD4qsb4Mo5BBy/P4OB8J0aBMFCqWx1JKghiyR2gM+IIRW5P8bB2JdIovAgMBAAECggEAc7NB66zs6kCO7HJnAg+yLVQw5acvdZgCTntoVBVZ49hafenP7UrR5/cTbQLDEtgjo5XWeL8R4aPap8x8g9Z5ESj2e4NoFj4zcB/6xhlCrjXojUTj1IcANfJ54vQmDvrlGftq/12XCDra5atoPqeB/grxR4kh9PV7T2771L/Ihb7AeXVEviOG0li7FY1aEAtCe1G++z04ayfo1CBAuAqPxZ+N8bnvJQ9DjF1MJN8vUikpEWrFNHtRi1V9ct3gkDHsegZnDHu1WNgFjU/oJtr43GXqRU04TJi5CG8wvUes/x2T9+vCT+bbJEwlzPyWKU8EpOQRz3oYlfCxaASl1mU3+QKBgQDzVFGk589Qju8M9E62Y50g90TS/GwgQd7cC5PiuV4tuM2p/32ElhVUJUt5an741Ty3zmgwrspKRCwmY9095HDaMp0itx8alL3/EHMldx/Gb5cr9H1CXSnwnA/dGv8k6OGmC18+dI4wCoeU+/WtgVCjXQ+v1gTZs59YXLeH3neqXQKBgQDBff62v9wfJavoAa/iPV/uhS2iLhS67hgYIMblTzEIKEDP8oIp8xCQpEtyxa1AX4Yd1do4SpQdvMIhmW7pTWeXn+8dk13YDnYy9K99mJIMY+khIg0G6huaBDvN4PFuOs2cbnXNLmzdvHC16RcH5Fa7ioaNwKqskc9vlZvfchR1+wKBgF81b9ixZznjI4ATG7Vb1sBuX/yaDgi1HWlGEnBVDZegRsCsmkVFoETTbuusEtB0RxS4a6YYzkgu0oOW8ZtlBg8qXLeXpVD2QD1MB3HyYXl4clMdj+FmqKFfvwlJpemgQaKBspuyaWw8wn419BQWlCHHqPqpKC6yjLe7V4iPMI11AoGARAbJA3Umraiv7IyTSqYrUQ9vgMJUtXe57tmvM7WI1oZYawOmsZrsKv4oLHzFMYmj/F9QLlRCCMZxNiDcdpepIQywo6RI7QoAkl+mRzDZwBNsRiLTk6fA9oAginxYRVnVKfdH4VA+JCL5OWtulm638417SuD+4FcPJ/rgZ0mTWfsCgYEA4+PDBmbp8uOEjhE8LxkLEcnwpWQZ5oXtQrBbD3SrwzRGHeJoWonW6U9Zmz/vc3BAQEiXKHy9ghVDlzduRiJhU40G5hRraVSo+JJWTC5ramh/kg9BrELajnDQHZ1kZ3NfIw/TFoQmY1kPKsfsIVzHMVXopszukupVJLB7aBVgzmw=')))
    ]).spread(function(alicePrivKey, bobPrivKey) {
      alice.privKey = alicePrivKey;
      bob.privKey = bobPrivKey;
      alice.connectionHandler = new ConnectionHandler({
        network: alice.network,
        verifier: alice.verifier,
        crypto: crypto,
        privKey: alicePrivKey
      });
      bob.connectionHandler = new ConnectionHandler({
        network: bob.network,
        verifier: bob.verifier,
        crypto: crypto,
        privKey: bobPrivKey
      });
      alice.network.init('alice').then(bob.network.init('bob')).then(function() {
        done();
      });
    });
  });

  it('should respond correctly to first auth challenge', function(done) {
    sinon.stub(window.crypto, 'getRandomValues', function(arr) {
      for(var i=0; i<arr.length; i++) {
        arr[i] = firstResponse[i];
      }
      return arr;
    });
    //bob.network.on('authChallenge', bob.connectionHandler.onAuthChallenge.bind(bob.connectionHandler));
    bob.network.on('authChallenge', function() {
      console.log('xxx');
    });

    /*bob.network.on('data', function(data) {
      crypto.decryptData(bob.privKey, data.data).then(function(result) {
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
    */
    alice.connectionHandler.connect('bob').then(function() {
    });
  });
});

