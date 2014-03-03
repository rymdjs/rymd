(function() {

  // Reference to `window` in the browser and `exports`
  // on the server.
  var root = this;

  var Q = require('q');
  var Utils = require("./utils");

  function Resource(name, data, author, key, version, type) {
    this.id = Utils.guid();
    this.metadata = {
      author: author,
      id: this.id,
      name: name,
      timestamp: Date.now(),
      key: key,
      version: version,
      type: type
    };
    this.data = data;
  }


  Resource.prototype = function() {

    var update = function(author, key) {
      this.metadata.version++;
      this.metadata.key = key;
      this.data = data;
    }

    return {
      update: update
    };
  }();

  module.exports = Resource;

})();
