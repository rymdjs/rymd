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

function base64ToUint8Array(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/').replace(/\s/g, '');
  return new Uint8Array(Array.prototype.map.call(atob(s), function (c) { return c.charCodeAt(0) }));
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

  it('should be able to get a saved resource', function(done) {
    var store = new Store();
    var saveCallback = sinon.spy(store, 'save');

    var resourceStore = new ResourceStore(store, RymdCrypto, { keyStore: 'keystore', dataStore: 'datastore' });

    resourceStore.createResource('john.jpeg', new Blob([]), 'john', 'image/jpeg').then(resourceStore.saveResource.bind(resourceStore))
      .then(function() {
        // store away the resource in our store
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

        resourceStore.getResource(resourceData[0]).then(function(resource) {
          var metadata = resource.metadata;

          metadata.author.should.be.equal('john');
          metadata.name.should.equal('john.jpeg');
          metadata.type.should.equal('image/jpeg');

          should.not.exist(resource.data);

          done();
        });
      });
  });

  it('should be able to get a saved resource and load its data', function(done) {
    var store = new Store();
    var saveCallback = sinon.spy(store, 'save');

    var resourceStore = new ResourceStore(store, RymdCrypto, { keyStore: 'keystore', dataStore: 'datastore' });

    resourceStore.createResource('john.jpeg', new Blob([]), 'john', 'image/jpeg').then(resourceStore.saveResource.bind(resourceStore))
      .then(function() {
        // store away the resource in our store
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

        resourceStore.getResource(resourceData[0], resourceStore.loadResourceData).then(function(resource) {
          var metadata = resource.metadata;

          metadata.author.should.be.equal('john');
          metadata.name.should.equal('john.jpeg');
          metadata.type.should.equal('image/jpeg');

          resource.hasData.should.be.true;
          resource.data.should.be.a('object');

          done();
        });
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

  it('should be able to set the private key', function(done) {
    var store = new Store();
    var saveCallback = sinon.spy(store, 'save');

    var resourceStore = new ResourceStore(store, RymdCrypto, { keyStore: 'keystore', dataStore: 'datastore' });

    // call set for a identity with the key
    var privateKey = "MIICeQIBADANBgkqhkiG9w0BAQEFAASCAmMwggJfAgEAAoGBANub8542CcDEFfwSlwLm7e7t1BOHiqJN7KQUvezgm0XhTOP13Co66OxDkrlrlUYX+O0HVFJRF36xIkOlqxN+APeREXGF4kmPxKwicthA9f696FCjNfpMVfafzjh92mN19p9gjfSPQJ345eZLouT7ahWx8eXWPtDnX1GVKCvMNn2DAgMBAAECgYEAxkRmDdB7va1Kq+mcrOIQrkXJ0lfssdvoabrQPawKg2yFHso5m2bUI3peXUjj3ASImHaliivsKlWBudE4QsDf3PasY3ePp1lpcs8CQMwRKjPMRQ0bKzmGVNrqUMtb37Fmdg7tdniwZtZC/OhZM3WpMGJoYGqPmBse+3mzL6evgQECQQDz9+fHuS7jEElcA9BLPjPlXDHY+kfzkoo6zlHGN3WqNHuX/Edh+gMbYUBhMd7iVcxAWvRaVAK23u+CzoOkb/6fAkEA5nCDFHj/FU12VGVFXwDMn9Kft/TXgEj38zHVCjz6wMs+0+gvti0hsJ3m8JOETZFIs4ZREsMOzP4AN4fcGPbqnQJBAH+iHEIioWLtLFPVMu2KV0AQ4YswNOA6s9JcCe/3J7mpx1cWBoo9b86tLC8tFfu3AypP6zIubVUagJcgT0KBzOUCQQBGUs+tz78IoTsbRkyFUZkgrQZQ/UdGvv3sGakKFtHvRBdIU/M7hUpiu81eXaZihZPKNZNIRn6d0GYAjFV+yNsJAkEAMNARsogydiYfMwZeSfQXFCXTgM9TdbHBucm6yDKmcMiftnpu7LaIfCCsFyqpfAs+5Ww2EztCjvbMb8Xpn2Hmdg==";

    resourceStore.setPrivateKey(privateKey, 'joe').then(function() {
      console.dir(saveCallback);

      saveCallback.callCount.should.be.equal(1);

      var saveData = saveCallback.firstCall.args;

      saveData[0].should.be.equal('joe-rsa-priv');
      // TODO make sure that its the same as the privateKey we passed
      saveData[1].should.be.a('object');

      done();
    });
  });

});