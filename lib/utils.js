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
	};
})();

