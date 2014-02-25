(function() {

	'use strict';

	// Reference to `window` in the browser and `exports`
	// on the server.
	var root = this;

	// Require Q, if possible
	var Q = root.Q;
	if (!Q && (typeof require !== 'undefined')) {
		Q = require('q');
	}

	// Module code ex.

	function Person(name) {
		// ...
		this.name = name;
	}

	Person.prototype.greet = function() {
		return "Hi " + this.name + "!";
	};


	// Exports

	if (typeof exports !== 'undefined') {
		if (typeof module !== 'undefined' && module.exports) {
			root = module.exports = Person;
		}
		root.Person = Person;
	} else {
		root.Person = Person;
	}

}).call(this);
