(function() {

	// Reference to `window` in the browser and `exports`
	// on the server.
	var root = this;

	var Q = require("q");
	var Utils = require("./utils");

    function ResourceStore(datastore, keystore, crypto) {
      this._store = datastore;
      this._keystore = datastore;
      this._crypto = crypto;
	}

    var getMasterKey = function() {
      var key = this._keystore.get('masterkey');
      if(!key) {
        key = this._crypto.generateSymmetricKey();
        this._keystore.save('masterkey', Utils.arrayBufferToBlob(key));
      }
      return key;
    };

	ResourceStore.prototype = {
      createResource: function(name, data, author) {
        var key = this._crypto.generateSymmetricKey();
        var resource = new Resource(name, data, author, key, 1);
        return resource;
      },
	};

	// Exports to module and browser scope

	module.exports = root.ResourceStore = ResourceStore;

})();
