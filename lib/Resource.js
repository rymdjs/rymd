(function() {

  // Reference to `window` in the browser and `exports`
  // on the server.
  var root = this;

  var Q = require('q');
  var Utils = require("./utils");

  function Resource(data, author, ) {
    this.id = Utils.guid();
    this.metadata = {
      author: author,
      id: this.id,

    };
  }


  Resource.prototype = function() {

    return {
    };
  }();

  module.exports = Resource;

})();
