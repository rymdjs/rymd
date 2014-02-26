# Rymd

Rymd is a Javascript library for distributed, peer-to-peer encrypted storage, and is also a Bachelor's project at [Chalmers University of Technology](http://chalmers.se).

Imagine a decentralized filesharing system, where all data is stored locally at every device ("node") instead of a central server storage. This is possible with Rymd, which makes use of modern web technologies like WebRTC, IndexedDB, WebCrypto, and more.

## Get started

On Alice's end:

	var rymd = new RymdNode({
		crypto: Rymd.Crypto.WebCrypto,
		keyStore: new Rymd.Data.IndexedDBStore,
		dataStore: new Rymd.Data.IndexedDBStore,
		network: new Rymd.Network.PeerJS.Peer,
		verifier: new Rymd.Security.DHT
	});

	rymd.init('alice');
	
	// rymd.connect(String|RymdNode)
	connection = rymd.connect('bob');

	connection.shareResource(guid).then(function(result) {
		console.log(result.status);
	});
	
	connection.on('request').then(function(request) {
		// auth of request is done here
		
		// send file
		rymd.getResource(request.guid)
			.then(connection.sendResource)
			.then(function(result) {
				console.log(result);
			});
	});
    


On Bob's end:

	var rymd = new RymdNode([options]);

	rymd.init('bob');

	rymd.on('connection').then(Rymd.verify).then(function(conn) {
		// 'conn' is a RymdConnection
		// Metadata is stored before this event is triggered
		conn.on('metadata').then(function(metadata) {
		/* 
			metadata = {
				guid: String,
				timestamp: Date|Long,
				node: RymdNode,
				author|owner: String,
				size: Number,
				checksum: String,
				key: String
			}; 
		*/
			// fetch resource instantly
			rymd.connect(metadata.node).then(function(connection) {
				// do stuff
			});
		});

		// do stuff
		conn.on('resource').then(rymd.saveResource);
		
		conn.listen();
	});
	

	// .. or wait for later
	rymd.connect('alice').then(function(connection){
		// Fetch existing metadata
		// metadata = { .. }
		connection.requestResource(metadata.guid).then(rymd.saveResource);
	});

## API

### Classes

- `RymdNode`
- `RymdConnection`
- (`RymdResource`)

## Build tasks
	
	# Default: builds bundle.js from lib/index.js
	gulp
	gulp build
	
	# Watches lib/index.js for changes and generates a build
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

Access http://localhost:3000 in the browser to run the test suite.

Tests run in a browser window for now, since headless browsers like PhantomJS don't support cutting edge HTML5 APIs like `IndexedDB` (as of PhantomJS 1.9.x).
