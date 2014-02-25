# Rymd

## Build tasks
	
	# Default: builds bundle.js from lib/main.js
	gulp
	gulp build
	
	# Watches lib/main.js for changes and generates a build
	gulp watch

	# Removes `build`
	gulp clean

## Develop

	npm install 
	gulp watch

A concatenated `bundle.js` will be generated in the `build` directory.

## Tests

Tests reside in the `test/tests.js` file, and uses Mocha and Chai.js.

	gulp test

Tests run in a browser window for now, since headless browsers like
PhantomJS don't support cutting edge HTML5 APIs like `IndexedDB` (as of
PhantomJS 1.9.x).
