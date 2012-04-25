/**
 * @name BufferedReader.
 * @description Fully configurable buffered reader for node.js.
 *
 * @author Gabriel Llamas
 * @created 10/04/2012
 * @modified 25/04/2012
 * @version 0.1.1
 */
"use strict";

var EVENTS = require ("events");
var FS = require ("fs");

var BUFFER_SIZE = 16384;

var INVALID_BUFFER_SIZE = new Error ("The buffer size must be greater than 0.");
var INVALID_BYTES_RANGE_ERROR = new Error ("The number of bytes must be greater than 0.");
var NO_FILE_ERROR = new Error ("The source is not a file.");

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
	
	if (bufferSize < 1) throw INVALID_BUFFER_SIZE;
	
	this._settings = {
		encoding: encoding,
		bufferSize: bufferSize
	};
	
	this._fileName = fileName;
	this._interrupted = false;
	this._fd = null;
	this._buffer = null;
	this._fileOffset = 0;
	this._bufferOffset = 0;
	this._eof = false;
	this._noMoreBuffers = false;
	this._fileSize = null;
	this._dataOffset = 0;
};

BufferedReader.prototype = Object.create (EVENTS.EventEmitter.prototype);
BufferedReader.prototype.constructor = BufferedReader;

BufferedReader.prototype.interrupt = function (){
	this._interrupted = true;
};

BufferedReader.prototype.read = function (){
	var stream = FS.createReadStream (this._fileName, this._settings);
	
	var lastChunk;
	var buffer;
	var me = this;
	
	var loop = this.listeners ("character").length !== 0 || this.listeners ("line").length !== 0 ||
		this.listeners ("byte").length !== 0;
	
	stream.on ("data", function (data){
		buffer = data;
		var offset = 0;
		var chunk;
		var character;
		var len = data.length;
		
		if (loop){
			for (var i=0; i<len; i++){
				if (me._interrupted) break;
				
				character = data[i];
				if (stream.encoding){
					me.emit ("character", character === "\r" ? "\n" : character);
				}else{
					me.emit ("byte", character);
					continue;
				}
				
				if (character === "\n" || character === "\r"){
					chunk = data.slice (offset, i);
					offset = i + 1;
					
					if (lastChunk){
						chunk = lastChunk.concat (chunk);
						lastChunk = null;
					}
					
					if (i + 1 !== len && character === "\r" && data[i + 1] === "\n"){
						i++;
					}
					
					me.emit ("line", chunk);
				}
			}
			
			if (stream.encoding && offset !== len){
				var s = offset === 0 ? data : data.slice (offset);
				lastChunk = lastChunk ? lastChunk.concat (s) : s;
			}
		}
		
		me.emit ("buffer", data);
		if (me._interrupted){
			me._interrupted = false;
			stream.destroy ();
			me.emit ("end");
		}
	});
	
	stream.on ("end", function (){
		me._interrupted = false;
		if (loop && lastChunk){
			me.emit ("line", lastChunk);
		}
		me.emit ("end");
	});
	
	stream.on ("error", function (error){
		me._interrupted = false;
		me.emit ("error", error);
	});
};

BufferedReader.prototype._open = function (cb){
	if (this._fd) return cb (null, this._fd);
	
	var me = this;
	FS.stat (this._fileName, function (error, stats){
		if (error) return cb (error, null);
		if (stats.isFile ()){
			FS.open (me._fileName, "r", function (error, fd){
				if (error) return cb (error, null);
				
				me._fileSize = stats.size;
				me._fd = fd;
				me._buffer = new Buffer (me._settings.bufferSize);
				me._read (function (error){
					if (error){
						return cb (error, null);
					}else{
						cb (null, me._fd);
					}
				});
			});
		}else{
			cb (NO_FILE_ERROR, null);
		}
	});
};

BufferedReader.prototype._read = function (cb){
	var me = this;
	var size = this._settings.bufferSize;
	FS.read (this._fd, this._buffer, 0, size, this._fileOffset, function (error, bytesRead){
		if (error) return cb (error);
		
		me._bufferValidSize = bytesRead;
		me._fileOffset += bytesRead;
		if (me._fileOffset === me._fileSize){
			me._noMoreBuffers = true;
		}
		if (bytesRead < size){
			me._buffer = me._buffer.slice (0, bytesRead);
		}
		cb ();
	});
};

BufferedReader.prototype.close = function (cb){
	if (cb) cb = cb.bind (this);
	if (!this._fd){
		if (cb) cb (null);
		return;
	}
	
	var me = this;
	FS.close (this._fd, function (error){
		me._fd = null;
		me._buffer = null;
		if (cb) cb.call (me, error);
	});
};

BufferedReader.prototype.readBytes = function (bytes, cb){
	cb = cb.bind (this);
	if (bytes < 1) return cb (INVALID_BYTES_RANGE_ERROR, null, -1);
	if (this._eof) return cb (null, null, 0);
	
	var fill = function (){
		var endData = bytes - me._dataOffset;
		var endBuffer = me._buffer.length - me._bufferOffset;
		var end = endData > endBuffer ? endBuffer : endData;
		
		me._buffer.copy (data, me._dataOffset, me._bufferOffset, me._bufferOffset + end);
		me._bufferOffset += end;
		if (me._bufferOffset === me._buffer.length) me._bufferOffset = 0;
		me._dataOffset += end;
		
		if (me._dataOffset === bytes){
			me._dataOffset = 0;
			me._eof = me._noMoreBuffers;
			cb (null, data, bytes);
		}else{
			if (me._noMoreBuffers){
				me._eof = true;
				end = me._dataOffset;
				me._dataOffset = 0;
				cb (null, data.slice (0, end), end);
			}else{
				me._read (function (error){
					if (error) return cb (error, null, -1);
					
					fill ();
				});
			}
		}
	};
	
	var me = this;
	var data = new Buffer (bytes);
	
	this._open (function (error, fd){
		if (error) return cb (error, null, -1);
		
		var len = me._buffer.length;
		
		if (bytes < len){
			var end = me._bufferOffset + bytes;
			
			if (end <= len){
				me._buffer.copy (data, 0, me._bufferOffset, end);
				me._bufferOffset = end;
				cb (null, data, bytes);
			}else{
				var last = len - me._bufferOffset;
				if (last !== 0){
					me._buffer.copy (data, 0, me._bufferOffset, me._bufferOffset + last);
				}
				if (me._noMoreBuffers){
					me._eof = true;
					return cb (null, data.slice (0, last), last);
				}
				
				me._read (function (error){
					if (error) return cb (error, null);
					
					len = me._buffer.length;
					var remaining = bytes - last;
					if (len <= remaining){
						me._eof = true;
						me._buffer.copy (data, last, 0, len);
						var lastChunk = last + len;
						cb (null, data.slice (0, lastChunk), lastChunk);
					}else{
						me._bufferOffset = remaining;
						me._buffer.copy (data, last, 0, me._bufferOffset);
						cb (null, data, bytes);
					}
				});
			}
		}else{
			fill ();
		}
	});
};

module.exports = BufferedReader;