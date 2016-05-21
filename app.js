#!/usr/bin/env node

var search = require('./index');
var stream = require('stream-wrapper');
var path = require('path');
var fs = require('fs');
var colors = require('colors');
var tty = require('tty');
var request = require('request');
var proc = require('child_process');
var osenv = require('osenv');
var argv = require('optimist').alias('u', 'username').alias('r','reset').argv;

var home = osenv.home();
var username = '';

try {
	username = fs.readFileSync(path.join(home,'.node-modules'), 'utf-8');
} catch (err) {
	// do nothing
}

var color = function(str, name) {
	return colors[name](str);
};

var setRawMode = function(mode) {
	process.stdin.setRawMode ? process.stdin.setRawMode(mode) : tty.setRawMode(mode);
};

var inverse = function(str) {
	return str.inverse;
};

var format = function() {
	return stream.transform({objectMode:true}, function(module, enc, callback) {
		var desc = module.description.trim().split(/\s+/).reduce(function(desc, word) {
			if (desc.length-(desc.lastIndexOf('\n')+1) + word.length > 80) return desc+'\n'+word;
			return desc + ' '+word;
		});

		var by = 'by '+(module.related ? inverse(module.author) : module.author)+' and used by ';
		if (module.relation.length) by += module.relation.map(inverse).join(' ')+' and ';
		by += module.dependents+' module'+(module.dependents === 1 ? '' : 's');

		var formatted = ''+
			color(color(module.name, 'bold'), 'cyan')+'  '+
			color(color('★'+module.stars, 'yellow'), 'bold')+'  '+
			color(module.url, 'grey')+'  '+ '\n'+color(by, 'grey')+'\n'+desc+'\n\n';

		callback(null, formatted);
	});
};

var noop = function() {};
var commands = {};

var error = function(msg) {
	console.log(msg.red);
	process.exit(1);
};

commands.search = function(args) {
	setRawMode(true);
	var less = proc.spawn('less', ['-R'], { stdio : [ null, 1, 2 ] });

	less.stdin.on('error', noop);  // ignore EPIPE
	less.on('exit', function() {
		process.exit(0);
	});

	search(args.join(' '), {username:argv.u || username}).pipe(format()).pipe(less.stdin);
};

commands.personalize = function() {
	var help = 'could not auto detect your github account\nuse --username to help';

	if (argv.r) {
		try {
			fs.unlinkSync(path.join(__dirname, '.username'));
		} catch (err) {
			// do nothing
		}
		console.log('results are no longer personalized'.green);
		return;
	}

	var onusername = function(login) {
		fs.writeFileSync(path.join(home, '.node-modules'), login);
		console.log('results are now personalized to '.green+login.bold);
	};

	if (argv.u) return onusername(argv.u);

	proc.exec('git config --global --get user.email', function(err, email) {
		email = (email || '').trim();
		if (!email) return error(help);
		request('https://api.github.com/search/users', {
			qs: {
				q: email
			},
			json: true,
			headers: {
				accept: 'application/vnd.github.preview.text-match+json'
			}
		}, function(err, response) {
			if (!response.body || !response.body.items || !response.body.items[0]) return error(help);
			var login = response.body.items[0].login;
			if (!login) return error(help);
			onusername(login);
		});
	});
};

commands.help = function() {
	process.stdout.write('\n');
	process.stdout.write(fs.readFileSync(path.join(__dirname, 'logo')));
	console.log(' Better search for Node.js modules.'.green+'\n');
	console.log(' current version is '.grey+require('./package').version.bold+(username && (' and searches are personlized to '.grey+username.bold)));
	console.log('\n node-modules search [query]'.bold);
	console.log('   # will search node-modules.com for query'.grey);
	console.log('   # use --username or -u to personalize to a specific user'.grey);
	console.log('\n node-modules personalize'.bold);
	console.log('   # will personalize your search results to using your github account'.grey);
	console.log('   # use --reset or -r to reset to default'.grey);
	console.log('\n node-modules help'.bold);
	console.log('   # will print this help\n'.grey);
};

(commands[argv._[0]] || commands.help)(argv._.slice(1));
