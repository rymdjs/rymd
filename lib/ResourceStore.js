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
      crypto.importKey('secret', 'encrypt', new Uint8Array(rawKey.data)).then(function(mk) {
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
            if(resource.data) {
              return dataStore().save(resource.id, resource.data);
            } else {
              return Q.fcall(function()  { return false; });
            }
          });
        }, function(e) {
          console.log(e);
        });
      };

      var _decryptResource = function(encMetadata, masterKey) {
        var dataStore = this._dataStore;
        var resource;
        return this._crypto.decryptData(masterKey, new Uint8Array(encMetadata))
				.then(Rymd.Utils.arrayBufferToBinaryString)
				.then(function(str) {
          resource = new Resource(JSON.parse(str));
          return dataStore().exists(resource.id);
        }).then(function(exists) {
          resource.hasData = exists;
          return resource;
        });
      };

      var getResource = function(guid, loadData) {
        var dataStore = this._dataStore;
        var crypto = this._crypto;
        var masterKey = getMasterKey.call(this);
        var resourcePromise = getMasterKey.call(this).then(function(masterKey) {
          return dataStore().get(guid + '-meta').then(function(item) {
            console.log('get metadata', guid);
            return _decryptResource.call(this, item.data, masterKey)
          }.bind(this));
        }.bind(this));

        if(loadData) {
          return resourcePromise.then(loadResourceData.bind(this));
        }
        return resourcePromise;
      };

      var getResourceKey = function(guid) {
        //TODO: Take Resource object as argument and use proper version instead of 1.
        var keyStore = this._keyStore;
        return keyStore().get(guid + '-k' + 1);
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

      var saveAvailableResource = function(from, data) {
        data.metadata.from = from;
        var resource = new Resource(data.metadata);
        console.log('saving available resource', resource);
        this.saveResource(resource);
        this._keyStore().save(resource.id+'-k'+resource.metadata.version, new Uint8Array(data.key));
      };

      return {
          createResource: createResource,
          getResources: getResources,
          getResource: getResource,
          getResourceKey: getResourceKey,
          saveResource: saveResource,
          loadResourceData: loadResourceData,
          saveAvailableResource: saveAvailableResource
      };
	}();

	// Exports to module and browser scope

	module.exports = ResourceStore;

})();
