(function() {

	// Reference to `window` in the browser and `exports`
	// on the server.
	var root = this;

	function RymdNode(identity, options) {
		this.network = options.network;
	}

	RymdNode.prototype = function() {

		var connect = function(identity) {
			return this.network.connect(identity);
		};

		var saveResource = function(data) {

		};

		var getResource = function(guid) {

		};

		return {
			connect: connect,
			saveResource: saveResource,
			getResource: getResource
		};
	}();

	module.exports = RymdNode;

})();
