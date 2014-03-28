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
    var keyStore = this._keyStore,
				crypto = this._crypto;

		function saveRawKey(key) {
			return crypto.exportKey(key).then(function(rawKey) {
				return keyStore().save('masterkey', rawKey);
			})
		}

    return keyStore().get('masterkey').then(function(rawKey) {
      if(!rawKey) {
        return crypto.generateSymmetricKey()
				.then(function(key) {
          return saveRawKey(key).then(function() {
						return key;
					});
        });
      }
			else {
      	return crypto.importKey('secret', 'encrypt', new Uint8Array(rawKey.data));
			}
    });
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
        var crypto = this._crypto,
						dataStore = this._dataStore;

        return getMasterKey.call(this).then(function(masterKey) {
          return crypto.encryptText(masterKey, JSON.stringify(resource.metadata));
				})
				.then(function(encMetadata) {
          return dataStore().save(resource.id + '-meta', encMetadata);
        }).then(function(id) {
          if(resource.data) {
            return dataStore().save(resource.id, resource.data);
          } else {
						return resource.id;
          }
        });
      };

      var _decryptResource = function(encMetadata, masterKey) {
        var dataStore = this._dataStore,
        		resource;

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

        var resourcePromise = getMasterKey.call(this).then(function(masterKey) {
          return dataStore().get(guid + '-meta').then(function(item) {
            return _decryptResource.call(this, item.data, masterKey)
          }.bind(this));
        }.bind(this));

        if(loadData) {
          return resourcePromise.then(loadResourceData.bind(this));
        }
        return resourcePromise;
      };

      var getDecryptedResource = function(guid) {
        var deferred = Q.defer(),
						crypto = this._crypto;

        Q.all([
          getResource.call(this, guid, loadResourceData),
          getResourceKey.call(this, guid)
        ]).spread(function(resource, rawKey) {
          crypto.importKey('secret', 'encrypt', new Uint8Array(rawKey.data)).then(function(dataKey) {
            crypto.decryptData(dataKey, resource.data.data).then(function(decryptedData) {
              resource.data.data = decryptedData;
              deferred.resolve(resource);
            });
          });
        });

        return deferred.promise;
      };

      var getResourceKey = function(guid) {
        //TODO: Take Resource object as argument and use proper version instead of 1.
        var keyStore = this._keyStore;
        return keyStore().get(guid + '-k' + 1);
      };

      var getResources = function() {
        var dataStore = this._dataStore;

				return Q.all([
					getMasterKey.call(this),
					dataStore().all()
				])
				.spread(function(masterKey, records) {
					var promises = records.filter(function(record) {
						return /-meta$/.test(record.guid);
					})
					.map(function(item) {
						return Q(_decryptResource.call(this, item.data, masterKey));
					}.bind(this));

					return Q.all(promises);

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

				return Q.all([
					this._keyStore().save(resource.id+'-k'+resource.metadata.version, new Uint8Array(data.key)),
					this.saveResource(resource)
				]);
      };

			var destroyResource = function(resource) {
				var promises = [
					this._dataStore().destroy(resource.id),
					this._dataStore().destroy(resource.id+'-meta'),
					this._keyStore().destroy(resource.id+'-k'+resource.metadata.version)
				];

				return Q.all(promises);
			};

      return {
          createResource: createResource,
          getResources: getResources,
          getResource: getResource,
          getDecryptedResource: getDecryptedResource,
          getResourceKey: getResourceKey,
          saveResource: saveResource,
          loadResourceData: loadResourceData,
          saveAvailableResource: saveAvailableResource,
					destroyResource: destroyResource
      };
	}();

	// Exports to module and browser scope

	module.exports = ResourceStore;

})();
