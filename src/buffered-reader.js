/**
 * @name BufferedReader.
 * @description Fully configurable buffered reader for node.js.
 *
 * @author Gabriel Llamas
 * @created 10/04/2012
 * @modified 11/04/2012
 * @version 0.0.2
 */
"use strict";

var EVENTS = require ("events");
var FS = require ("fs");
var PATH = require ("path");

var BUFFER_SIZE = 16384;
var SLASH = PATH.normalize ("/");

var getFileName = function (fileName){
	var main = process.mainModule.filename;
	var cwd = main.substring (0, main.lastIndexOf (SLASH));
	var relative = PATH.relative (process.cwd (), cwd);
	return PATH.join (relative, fileName);
};

var BufferedReader = function (fileName, bufferSize, encoding){
	EVENTS.EventEmitter.call (this);
	
	var argsLen = arguments.length;
	if (argsLen === 1){
		bufferSize = BUFFER_SIZE;
		encoding = null;
	}else if (argsLen === 2 && typeof bufferSize === "string"){
		encoding = bufferSize;
		bufferSize = BUFFER_SIZE;
	}
	
	this._stream = FS.createReadStream (getFileName (fileName), {
		bufferSize: bufferSize,
		encoding: encoding
	});
	
	var me = this;
	this._stream.on ("error", function (error){
		me.emit ("error", error);
	});
};

BufferedReader.prototype = Object.create (EVENTS.EventEmitter.prototype);
BufferedReader.prototype.constructor = BufferedReader;

BufferedReader.prototype.read = function (){
	var lastChunk;
	var buffer;
	var me = this;
	
	var loop = this.listeners ("character").length !== 0 || this.listeners ("line").length !== 0 ||
		this.listeners ("byte").length !== 0;
	
	this._stream.on ("data", function (data){
		buffer = data;
		var offset = 0;
		var chunk;
		var character;
		var len = data.length;
		
		if (loop){
			for (var i=0; i<len; i++){
				character = data[i];
				if (me._stream.encoding){
					me.emit ("character", character);
				}else{
					me.emit ("byte", character);
					continue;
				}
				
				var eol = character === "\n" || character === "\r";
				if (eol){
					chunk = data.slice (offset, i++);
					offset = i;
					
					if (lastChunk){
						chunk = lastChunk.concat (chunk);
						lastChunk = null;
					}
					
					if (i+1 !== len && character === "\r" && data[i+1] === "\n"){
						i++;
					}
					
					me.emit ("line", chunk);
				}
			}
			
			if (me._stream.encoding && offset !== len){
				var s = offset === 0 ? data : data.slice (offset);
				lastChunk = lastChunk ? lastChunk.concat (s) : s;
			}
		}
		
		me.emit ("buffer", data);
	});
	
	this._stream.on ("end", function (){
		if (loop && lastChunk){
			me.emit ("line", lastChunk);
		}
		
		me.emit ("end");
	});
};

module.exports.BufferedReader = BufferedReader;