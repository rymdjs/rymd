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
      var deferred = Q.defer();
      var key;
      var keyStore = this._keyStore;
      var crypto = this._crypto;
      keyStore.get('masterkey').then(function(rawKey) {
        if(!rawKey) {
          return crypto.generateSymmetricKey().then(function(_key) {
            key = _key;
            return crypto.exportKey(key);
          }).then(function(rawKey) {
            console.log('new masterKey', key, rawKey);
            return keyStore.save('masterkey', Utils.arrayBufferToBlob(rawKey));
          }).then(function() {
            console.log('done', key);
            return deferred.resolve(key);
          });
        }
        return crypto.importKey('secret',new Uint8Array(rawKey.data))
      });
      return deferred.promise;
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
          return crypto.encryptBlob(key, data)
        }).then(function(encData) {
          resource = new Resource(name, encData, author, key, 1, type);
          return crypto.exportKey(key);
        }).then(function(rawKey) {
          return keyStore.save(resource.id+'-k1', rawKey);
        }).then(function() {
          deferred.resolve(resource);
        });
        return deferred.promise;
      };

      var saveResource = function(resource) {
        var crypto = this._crypto;
        var keyStore = this._keyStore;
        var store = this._store;
        console.log('save resource', resource);
        return getMasterKey.call(this).then(function(masterKey) {
          console.log('master key', masterKey);
          return crypto.encryptText(masterKey, JSON.stringify(resource.metadata)).then(function(encMetadata) {
            console.log(1, encMetadata);
            return store.save(resource.id + '-meta', encMetadata);
          }).then(function() {
            console.log(3, resource);
            return store.save(resource.id, resource.data);
          });
        });
      };

      var getResource = function(guid) {
        return this._store.get(guid);
      };

      var getResources = function() {
        var store = this._store;
        var masterKey = getMasterKey.call(this);
        return this._store.all().then(function(items) {
          items.forEach(function(item) {
            if(/-meta/.test(item.guid)) {
              store.decryptBlob(masterKey, item.data).then(function(data) {
                console.log(data);
              });
            }
          });
        });
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
