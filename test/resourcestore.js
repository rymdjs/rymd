var should = chai.should();

function readAsText(blob) {
  var deferred = Q.defer();

  var reader = new FileReader();

  reader.onload = function(ev) {
    deferred.resolve(ev.target.result);
  };

  reader.readAsText(blob);

  return deferred.promise;
}


describe('ResourceStore', function() {

  it('should create a resource', function(done) {
    var store = new Store();
    var saveCallback = sinon.spy(store, 'save');

    var resourceStore = new ResourceStore(store, RymdCrypto, { keyStore: 'keystore', dataStore: 'datastore' });

    resourceStore.createResource('john.jpeg', new Blob([]), 'john', 'image/jpeg').then(function(resource) {
      // make sure that a resource is resolved, and that it tries to save key
      saveCallback.calledOnce.should.be.true;

      var keyString = saveCallback.firstCall.args[0];
      keyString.should.be.an('string');

      resource.should.be.an('object');

      done();
    });

  });

  it('should be able to save a resource', function(done) {
    var store = new Store();
    var saveCallback = sinon.spy(store, 'save');

    var resourceStore = new ResourceStore(store, RymdCrypto, { keyStore: 'keystore', dataStore: 'datastore' });

    resourceStore.createResource('john.jpeg', new Blob([]), 'john', 'image/jpeg').then(resourceStore.saveResource)
      .then(function() {

      });

    // it will attempt to get the masterkey
      // assert that save is called on KeyStore?

    //
  });

  // it('should be able to save a resource and then decrypt it', function(done) {
  //   var store = new Store();
  //   var saveCallback = sinon.spy(store, 'save');

  //   var resourceStore = new ResourceStore(store, RymdCrypto, { keyStore: 'keystore', dataStore: 'datastore' });

  //   resourceStore.createResource('john.jpeg', new Blob([]), 'john', 'image/jpeg').then(function(resource) {
  //     // cache the resource

  //     // call the decrypt method


  //   });

  });

});