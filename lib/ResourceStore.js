(function() {

	// Reference to `window` in the browser and `exports`
	// on the server.
	var root = this,
			Q = require("q");

	var Resource = require("./Resource");

  function ResourceStore(store, crypto, stores) {
    this._store = store;
    this._crypto = crypto;
    this._stores = stores;
    this._keyStore = function() {
      return store.use(stores.keyStore);
    };
    this._dataStore = function() {
      return store.use(stores.dataStore);
    };
    this._availableStore = function() {
      return store.use(stores.availableStore);
    };
  }

  var getMasterKey = function() {
    var deferred = Q.defer();
    var key;
    var keyStore = this._keyStore;
    var crypto = this._crypto;

    keyStore().get('masterkey').then(function(rawKey) {
      if(!rawKey) {
        return crypto.generateSymmetricKey().then(function(_key) {
          key = _key;
          return crypto.exportKey(key);
        }).then(function(rawKey) {
          return keyStore().save('masterkey', rawKey);
        }).then(function() {
          return deferred.resolve(key);
        });
      }
      crypto.importEncryptKey('secret', new Uint8Array(rawKey.data)).then(function(mk) {
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
            id: Rymd.Utils.guid(),
            timestamp: Date.now()
          }, encData);
          return crypto.exportKey(key);
        }).then(function(rawKey) {
          return keyStore().save(resource.id+'-k1', rawKey);
        }).then(function() {
          deferred.resolve(resource);
        });
        return deferred.promise;
      };

      var saveResource = function(resource) {
        var crypto = this._crypto;
        var dataStore = this._dataStore;

        console.log('save resource', resource);
        return getMasterKey.call(this).then(function(masterKey) {
          console.log('master key', masterKey);
          return crypto.encryptText(masterKey, JSON.stringify(resource.metadata)).then(function(encMetadata) {
            return dataStore().save(resource.id + '-meta', encMetadata);
          }).then(function() {
            return dataStore().save(resource.id, resource.data);
          });
        }, function(e) {
          console.log(e);
        });
      };

      var _decryptResource = function(encMetadata, masterKey) {
        return this._crypto.decryptData(masterKey, new Uint8Array(encMetadata)).then(Rymd.Utils.arrayBufferToBinaryString).then(function(str) {
          return new Resource(JSON.parse(str));
        });
      };

      var getResource = function(id) {
        var dataStore = this._dataStore;
        var crypto = this._crypto;
        var masterKey = getMasterKey.call(this);
        return getMasterKey.call(this).then(function(masterKey) {
          return dataStore().get(id).then(function(item) {
            return _decryptResource.call(this, item.data, masterKey);
          }.bind(this));
        }.bind(this));
      };

      var getResourceMetadata = function(guid) {
        var dataStore = this._dataStore;
        var crypto = this._crypto;
        var masterKey = getMasterKey.call(this);
        return getMasterKey.call(this).then(function(masterKey) {
          return dataStore().get(guid + '-meta').then(function(item) {
            return _decryptResource.call(this, item.data, masterKey)
          }.bind(this));
        }.bind(this));
      };

      var getResourceKey = function(guid) {
        var keyStore = this._keyStore;
        return keyStore().get(guid + '-k1');
      };

      var getResources = function() {
        var dataStore = this._dataStore;
        var crypto = this._crypto;
        var masterKey = getMasterKey.call(this);
        return getMasterKey.call(this).then(function(masterKey) {
          return dataStore().all().then(function(items) {
            var promises = items.map(function(item) {
              if(/-meta$/.test(item.guid)) {
                return _decryptResource.call(this, item.data, masterKey);
              }
            }.bind(this)).filter(function(e) { return e; });
            return Q.all(promises);
          }.bind(this));
        }.bind(this));
      };

      var loadResourceData = function(resource) {
        return this._dataStore().get(resource.id).then(function(data) {
          resource.data = data;
          return resource;
        });
      };

      var getAvailableResource = function(guid) {
        var availableStore = this._availableStore;

        return availableStore().get(guid);
      };

      var saveAvailableResource = function(from, data) {
        var availableStore = this._availableStore;

        return availableStore().save(Rymd.Utils.guid(), {
          from: from,
          metadata: data.metadata,
          key: data.key
        });
      };

      return {
          createResource: createResource,
          getResources: getResources,
          getResourceMetaData: getResourceMetadata,
          getResourceKey: getResourceKey,
          saveResource: saveResource,
          loadResourceData: loadResourceData,
          getAvailableResource: getAvailableResource,
          saveAvailableResource: saveAvailableResource
      };
	}();

	// Exports to module and browser scope

	module.exports = ResourceStore;

})();
