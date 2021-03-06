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

    resourceStore.createResource('john.jpeg', new Blob([]), 'john', 'image/jpeg').then(resourceStore.saveResource.bind(resourceStore))
      .then(function() {
        saveCallback.callCount.should.be.equal(4);

        var resourceKey = saveCallback.getCall(0).args;
        var masterKey = saveCallback.getCall(1).args;
        var metadata = saveCallback.getCall(2).args;
        var resourceData = saveCallback.getCall(3).args;

        metadata[0].should.be.an('string');
        metadata[1].should.be.an('object');

        resourceData[0].should.be.an('string');
        resourceData[1].should.be.an('object');

        done();
      });
  });

    it('should be able to save a resource and decrypt it', function(done) {
    var store = new Store();
    var saveCallback = sinon.spy(store, 'save');

    var resourceStore = new ResourceStore(store, RymdCrypto, { keyStore: 'keystore', dataStore: 'datastore' });

    var beforeCreateData = new Blob([]);
    resourceStore.createResource('john.jpeg', beforeCreateData, 'john', 'image/jpeg').then(resourceStore.saveResource.bind(resourceStore))
      .then(function() {
        saveCallback.callCount.should.be.equal(4);

        var resourceKey = saveCallback.getCall(0).args;
        var masterKey = saveCallback.getCall(1).args;
        var metadata = saveCallback.getCall(2).args;
        var resourceData = saveCallback.getCall(3).args;

        /*
          Stub for #get on IndexedDBStore which gets called by ResourceStore, in call to #createResource
          masterKey, encrypted metadata and stuff like that was "saved" to the database, which we
          now resolves when asked for again
         */
        var stub = sinon.stub(store, 'get', function(guid) {
          var deferred = Q.defer();

          if (guid === 'masterkey') {
            deferred.resolve({ data: masterKey[1]});
          } else if (guid === resourceData[0] + '-meta') {
            deferred.resolve({ data: metadata[1] });
          } else if (guid === resourceData[0] + '-k1') {
            deferred.resolve({ data: resourceKey[1] });
          } else if (guid === resourceData[0]) {
            deferred.resolve({ data: new Uint8Array(resourceData[1]) });
          }

          return deferred.promise;
        });

        // assert that the resource looks like before being saved
        resourceStore.getDecryptedResource(resourceData[0]).then(function(resource) {

          var metadata = resource.metadata;

          metadata.name.should.equal('john.jpeg');
          metadata.author.should.equal('john');
          metadata.type.should.equal('image/jpeg');

          var decryptedData = new Blob([resource.data.data]);

          Q.all([
            readAsText(beforeCreateData),
            readAsText(decryptedData)
          ]).spread(function(beforeCreateDataString, decryptedDataString) {
            beforeCreateDataString.should.be.equal(decryptedDataString);

            done();
          });

        });
      });
  });

});