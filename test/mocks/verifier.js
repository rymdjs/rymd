(function() {

  var Utils = RymdUtils,
      Logger = RymdLogger;

  var logger = new Logger('Verifier');

  var identities = {
    {'id':'alice','endpoints':{'aliceEndpoint':{'id':'aliceEndpoint','lastSeen':Date.now()}},'rsa':'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDqUl29OSqC6MdcmzgfACGM4mtahaBs5H5ckquJVf9Dr3kKt9GPcHTRCLlh9R58pEi237Jsm0sIS/hZWuk3wfP82ykCbzP5rixgErNuvOX/SBqfpVgTgyN3N+WLkKl774qwsOkc4+auge58vGamKjNZnYgB8v6Yt2GtyH63fE6LsQIDAQAB'},
    {'id':'bob','endpoints':{'bobEndpoint':{'id':'bobEndpoint','lastSeen':Date.now()}},'rsa':'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAt+pT1I2ZSC3OeBUIkL3HtqvfZo7n61UYxYnUxKs83S+4T1sR1WJxNh6VNUhRv4ft16+9baiA6GjWnQagj2CHKPmPDqWY8xfCvelhEbpAHPalvm1Z6YDAtx08+it1WucYZsc8NAlz8ZTcVM60V0zUqb23839HmV7Y9+LpVBbO42vN/roT1d4yTTzT5590xFCVgNtoZlfGHAEJmGVEjhP7KN/a1fNxTnrIo4UUmU2ZZskZ30VWpWLW/cbWwQuS21qjNdUirBoL2BvWzW3TyjB6PDyn4wgR9yw+KrG+DKOQQcvz+DgfCdGgTBQqlsdSSoIYskdoDPiCEVuT/GwdiXSKLwIDAQAB'},
    {'id':'claire','endpoints':{'claireEndpoint':{'id':'claireEndpoint','lastSeen':Date.now()},'ydb5i9jduc2138fr':{'id':'ydb5i9jduc2138fr','lastSeen':1396006988782},'1xhwns3tleq4zpvi':{'id':'1xhwns3tleq4zpvi','lastSeen':1396006996898}},'rsa':'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCshFJDQ7BZe38jJjjFePZlxu0cleceqm+dwJRscI1tv3G+rE9YVmZGRyRa/qT3wmOrD7RzAG/2TS84R0uX++ILDKpsSpjFXPad7pF+ZwkEG7H4UE/aApA2LEWgWgJBhdurxJGCirNaG6+JOq4q/efY5gKijdKY9p5izh41SuXVcQIDAQAB'}
  };

  function Verifier(options) {
    this.identity = null;
  }

  Verifier.prototype = function() {
    var lookupIdentity = function(identity) {
      var deferred = Q.defer();
      deferred.resolve(identities[identitiy]);
      return deferred.promise;
    };

    var registerEndpoint = function(endpoint) {
      var deferred = Q.defer();
      deferred.resolve();
      return deferred.promise;
    };

    return {
      lookupIdentity : lookupIdentity,
      registerEndpoint: registerEndpoint
    };
  }();

  this.Verifier = Verifier;

}).call(this);

