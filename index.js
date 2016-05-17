#!/usr/bin/env node

var request = require('request');
var stream = require('stream-wrapper');

module.exports = function(query, opts) {
	if (!opts) opts = {};

	var marker = opts.marker || '';
	var username = opts.username || '';

	var buffer = [];
	var self = stream.readable({objectMode:true, highWaterMark:1}, function() {
		if (self.destroyed) return;
		if (buffer.length) return self.push(buffer.shift());

		request('http://node-modules.com/search.json', {
			qs: {
				q: query,
				u: username,
				marker: marker
			},
			json:true,
		}, function(err, response) {
			if (err) return self.emit('error', err);
			if (!response.body.length) return self.push(null);

			response.body.forEach(function(data) {
				buffer.push(data);
				marker = data.marker;
			});
			self.push(buffer.shift());
		});
	});

	return self;
};
