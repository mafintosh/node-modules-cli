#!/usr/bin/env node

var request = require('request');
var stream = require('stream-wrapper');
var colors = require('colors');
var tty = require('tty');
var spawn = require('child_process').spawn;

stream = stream.defaults({objectMode:true});

if (process.argv[2] !== 'search') {
	console.log('usage: node-modules search [query]');
	process.exit(1);
}

var marker = '';
var query = process.argv.slice(3).join(' ');

var buffer = [];
var search = stream.readable(function() {
	if (buffer.length) return search.push(buffer.shift());

	request('http://node-modules.com/search.json?limit=60&q='+encodeURIComponent(query), {
		json:true
	}, function(err, response) {
		response.body.forEach(function(data) {
			buffer.push(data);
		});
		buffer.push(null);
		search.push(buffer.shift());
	});
});

var setRawMode = function(mode) {
	process.stdin.setRawMode ? process.stdin.setRawMode(mode) : tty.setRawMode(mode);
};

var inverse = function(str) {
	return str.inverse;
};

var toAnsi = function(module) {
	var desc = module.description.trim().split(/\s+/).reduce(function(desc, word) {
		if (desc.length-(desc.lastIndexOf('\n')+1) + word.length > 80) return desc+'\n'+word;
		return desc + ' '+word;
	});

	var by = 'by '+(module.related ? inverse(module.author) : module.author)+' and used by ';
	if (module.relation.length) by += module.relation.map(inverse).join(' ')+' and ';
	by += module.dependents+' module'+(module.dependents === 1 ? '' : 's');

	return module.name.bold.cyan+'  '+('★'+module.stars).yellow.bold+'  '+module.url.grey+'  '+ '\n'+by.grey+'\n'+desc+'\n\n';
};

var format = stream.transform(function(data, enc, callback) {
	callback(null, toAnsi(data));
});

setRawMode(true);

search.pipe(format).pipe(spawn('less', ['-R'], { customFds : [ null, 1, 2 ] }).stdin);