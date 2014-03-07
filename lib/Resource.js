(function() {

  function Resource(metadata, data) {
    this.metadata = metadata;
    this.id = metadata.id;
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
