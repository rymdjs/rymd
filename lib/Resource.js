(function() {

  // Reference to `window` in the browser and `exports`
  // on the server.
  var root = this;

  var Q = require('q');
  var Utils = require("./utils");

  function Resource(metadata, data) {
    this.metadata = metadata;
    this.id = metadata.id;
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
