"use strict";

var assert = require ("assert");
var br = require ("../lib");
var fs = require ("fs");

var readOriginal = fs.read;
var readCalls = 0;
fs.read = function (){
	readCalls++;
	readOriginal.apply (null, arguments);
};

var file = "file";
var small = { highWaterMark: 5 };

var tests = {
	"file size <= buffer size": function (done){
		br.open (file)
				.on ("error", assert.ifError)
				.on ("close", function (){
					assert.strictEqual (readCalls, 1);
					readCalls = 0;
					done ();
				})
				.read (3, function (bytesRead, buffer){
					assert.strictEqual (bytesRead, 3);
					assert.deepEqual (buffer, new Buffer ([0, 1, 2]));
				})
				.close ();
	},
	"case 2": function (done){
		br.open (file, small)
				.on ("error", assert.ifError)
				.on ("close", function (){
					assert.strictEqual (readCalls, 1);
					readCalls = 0;
					done ();
				})
				.read (3, function (bytesRead, buffer){
					assert.strictEqual (bytesRead, 3);
					assert.deepEqual (buffer, new Buffer ([0, 1, 2]));
				})
				.close ();
	},
	"case 2, multiple reads": function (done){
		br.open (file, small)
				.on ("error", assert.ifError)
				.on ("close", function (){
					assert.strictEqual (readCalls, 2);
					readCalls = 0;
					done ();
				})
				.read (6, function (bytesRead, buffer){
					assert.strictEqual (bytesRead, 6);
					assert.deepEqual (buffer, new Buffer ([0, 1, 2, 3, 4, 5]));
				})
				.close ();
	},
	"case 1": function (done){
		br.open (file, small)
				.on ("error", assert.ifError)
				.on ("close", function (){
					assert.strictEqual (readCalls, 1);
					readCalls = 0;
					done ();
				})
				.read (3, function (){})
				.seek (0)
				.read (3, function (bytesRead, buffer){
					assert.strictEqual (bytesRead, 3);
					assert.deepEqual (buffer, new Buffer ([0, 1, 2]));
				})
				.close ();
	},
	"case 3": function (done){
		br.open (file, small)
				.on ("error", assert.ifError)
				.on ("close", function (){
					assert.strictEqual (readCalls, 2);
					readCalls = 0;
					done ();
				})
				.read (3, function (){})
				.read (3, function (bytesRead, buffer){
					assert.strictEqual (bytesRead, 3);
					assert.deepEqual (buffer, new Buffer ([3, 4, 5]));
				})
				.close ();
	},
	"case 3, multiple reads": function (done){
		br.open (file, small)
				.on ("error", assert.ifError)
				.on ("close", function (){
					assert.strictEqual (readCalls, 3);
					readCalls = 0;
					done ();
				})
				.read (3, function (){})
				.read (8, function (bytesRead, buffer){
					assert.strictEqual (bytesRead, 8);
					assert.deepEqual (buffer, new Buffer ([3, 4, 5, 6, 7, 8, 9, 10]));
				})
				.close ();
	},
	"case 4": function (done){
		br.open (file, small)
				.on ("error", assert.ifError)
				.on ("close", function (){
					assert.strictEqual (readCalls, 2);
					readCalls = 0;
					done ();
				})
				.seek (2)
				.read (3, function (){})
				.seek (0)
				.read (4, function (bytesRead, buffer){
					assert.strictEqual (bytesRead, 4);
					assert.deepEqual (buffer, new Buffer ([0, 1, 2, 3]));
				})
				.close ();
	},
	"case 4, multiple reads": function (done){
		var r=br.open (file, small)
				.on ("error", assert.ifError)
				.on ("close", function (){
					assert.strictEqual (readCalls, 3);
					readCalls = 0;
					done ();
				})
				.seek (7)
				.read (3, function (){})
				.seek (0)
				.read (12, function (bytesRead, buffer){
					assert.strictEqual (bytesRead, 12);
					assert.deepEqual (buffer,
							new Buffer ([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]));
				})
				.close ();
	}
};

var keys = Object.keys (tests);
var keysLength = keys.length;

(function again (i){
	if (i<keysLength){
		var fn = tests[keys[i]];
		if (fn.length){
			fn (function (){
				again (i + 1);
			});
		}else{
			fn ();
			again (i + 1);
		}
	}
})(0);