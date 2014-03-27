(function() {

  var root = this;

  function Resource(metadata, data) {
    this.metadata = metadata;
    this.id = metadata.id;
    this.data = data;
    this.hasData = !!data;
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

  module.exports = root.Resource = Resource;

})();
