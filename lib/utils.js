module.exports = (function() {

  // Root scope
  var root = this,
  // Array#slice shortcut
    slice = Array.prototype.slice;

  var Q = require("q"),
    URL = this.URL || this.webkitURL;

  // Private

  function S4() {
    return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
  }

  // Public

  return {

    /**
     * Generate a pseudo-random GUID.
     *
     * Ex: 343165fe-25cb-bb5b-4504-76c1995f971b
     *
     * @return {String} A GUID
     */
    guid: function() {
      return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
    },
    arrayBufferToBinaryString: function(buffer) {
      var fr = new FileReader(),
        defer = Q.defer();

      fr.onload = function(evt) {
              var result = evt.target.result;
        defer.resolve(result.slice(0, result.indexOf('\0')));
      }
      fr.onerror = function(err) {
        defer.reject(err);
      }

      var uInt8Array = new Uint8Array(buffer);
      fr.readAsBinaryString(new Blob([uInt8Array]));

      return defer.promise;
    },
  };
})();
