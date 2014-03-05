(function() {

  // Reference to `window` in the browser and `exports`
  // on the server.
  var root = this;

  var Q = require('q');
  var Utils = require("./utils");

  function Resource(name, data, author, version, type) {
    this.id = Utils.guid();
    this.metadata = {
      author: author,
      id: this.id,
      name: name,
      timestamp: Date.now(),
      version: version,
      type: type
    };
    this.data = data;
  }


  Resource.prototype = function() {

    var update = function(data) {
      this.metadata.version++;
      this.data = data;
    }

    return {
      update: update
    };
  }();

  module.exports = Resource;

})();
