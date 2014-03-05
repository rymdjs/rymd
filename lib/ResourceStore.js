(function() {

	// Reference to `window` in the browser and `exports`
	// on the server.
	var root = this;

	var Q = require("q");
	var Utils = require("./utils");
	var Resource = require("./Resource");

    function ResourceStore(dataStore, keyStore, crypto) {
      this._store = dataStore;
      this._keyStore = keyStore;
      this._crypto = crypto;
	}

    var getMasterKey = function() {
      console.log(this);
      var key = this._keyStore.get('masterkey');
      if(!key) {
        key = this._crypto.generateSymmetricKey();
        this._keystore.save('masterkey', Utils.arrayBufferToBlob(key));
      }
      return key;
    };

	ResourceStore.prototype = function() {
      var createResource = function(name, data, author, type) {
        var deferred = Q.defer();
        var resource;
        var key;
        var crypto = this._crypto;
        var keyStore = this._keyStore;
        this._crypto.generateSymmetricKey().then(function(_key) {
          key = _key;
          console.log('1', data);
          return crypto.encryptBlob(key, data)
        }).then(function(encData) {
          console.log('1.5');
          resource = new Resource(name, encData, author, key, 1, type);
          console.log('2');
          return crypto.exportKey(key);
        }).then(function(rawKey) {
          console.log('3');
          return keyStore.save(resource.id+'-k1', rawKey);
        }).then(function() {
          console.log('4');
          deferred.resolve(resource);
        });
        return deferred.promise;
      };

      var saveResource = function(resource) {
        console.log(this);
        var masterKey = getMasterKey.call(this);
        console.log('save resource', resource);
        return this._crypto.encryptText(masterKey, JSON.stringify(resource.metadata)).then(function(encMetadata) {
          return this._store.save(resource.id + '-meta', encMetadata);
        }).then(function() {
          return this._crypto.encryptBlob(resource.metadata.key, resource.data);
        }).then(function(encData) {
          return this._store.save(resource.id, encData);
        });
      };

      var getResource = function(guid) {
        return this._store.get(guid);
      };

      var getResources = function() {
        return this._store.all();
      };

      return {
          createResource: createResource,
          getResources: getResources,
          saveResource: saveResource
      };
	}();

	// Exports to module and browser scope

	module.exports = root.ResourceStore = ResourceStore;

})();
