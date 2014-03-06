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
        crypto.importKey('secret',new Uint8Array(rawKey.data)).then(function(mk) {
          return deferred.resolve(mk);
        });
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
          resource = new Resource({
            name: name,
            author: author,
            version: 1,
            type: type,
            id: Utils.guid(),
            timestamp: Date.now()
          }, encData);
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
            return store.save(resource.id + '-meta', encMetadata);
          }).then(function() {
            return store.save(resource.id, resource.data);
          });
        }, function(e) {
          console.log(e);
        });
      };

      var getResource = function(guid) {
        return this._store.get(guid);
      };

      var getResources = function() {
        var store = this._store;
        var crypto = this._crypto;
        var masterKey = getMasterKey.call(this);
        return getMasterKey.call(this).then(function(masterKey) {
          return store.all().then(function(items) {
            var promises = items.map(function(item) {
              if(/-meta$/.test(item.guid)) {
                return crypto.decryptData(masterKey, new Uint8Array(item.data)).then(Utils.arrayBufferToBinaryString).then(function(str) {
                  return new Resource(JSON.parse(str));
                });
              }
            }).filter(function(e) { return e; });
            return Q.all(promises);
          });
        });
      };

      var loadResourceData = function(resource) {
        return this._store.get(resource.id).then(function(data) {
          resource.data = data;
          return resource;
        });
      };

      return {
          createResource: createResource,
          getResources: getResources,
          saveResource: saveResource,
          loadResourceData: loadResourceData
      };
	}();

	// Exports to module and browser scope

	module.exports = root.ResourceStore = ResourceStore;

})();
