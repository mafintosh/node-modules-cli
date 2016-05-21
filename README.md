# node-modules-cli

Node.js module and cli tool for searching node-modules.com

	npm install -g node-modules

## Usage

After installation you can search for node modules through the terminal by doing

	node-modules search my query

This will spawn a `less` instance will the search result nicely formatted.
You can also personalize your results by ranking modules by authors you follow
or star on github by running

	node-modules personalize

If your github account could not be auto detected, use `-u` to specify it, e.g.:

	node-modules personalize -u mafintosh

For more information run `node-modules help`

## Module

You can also use it from within your node application

``` js
var search = require('node-modules');
var stream = search('test framework', {username:'mafintosh'});

stream.on('data', function(result) {
	console.log(result);
});

stream.on('end', function() {
	console.log('no more results');
});
```

## License

MIT
