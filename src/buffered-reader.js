/**
 * @name BufferedReader.
 * @description Fully configurable buffered reader for node.js.
 *
 * @author Gabriel Llamas
 * @created 10/04/2012
 * @modified 05/08/2012
 * @version 0.2.6
 */
"use strict";

var EVENTS = require ("events");
var FS = require ("fs");

var Error = require ("errno-codes");

Error.create ("INVALID_BUFFER_SIZE", Error.getNextAvailableErrorCode (),
		"The buffer size must be greater than 0.");
Error.create ("INVALID_START_OFFSET", Error.getNextAvailableErrorCode (),
		"The start offset must be greater than or equals to 0.");
Error.create ("INVALID_END_OFFSET", Error.getNextAvailableErrorCode (),
		"The end offset must be greater than or equals to 0.");
Error.create ("INVALID_RANGE_OFFSET", Error.getNextAvailableErrorCode (),
		"The end offset must be greater than or equals to the start offset.");
Error.create ("INVALID_BYTES_RANGE_ERROR", Error.getNextAvailableErrorCode (),
		"The number of bytes to read must be greater than 0.");
Error.create ("INVALID_SEEK_OFFSET", Error.getNextAvailableErrorCode (),
		"The offset must be greater than or equals to 0.");
Error.create ("NO_FILE", Error.getNextAvailableErrorCode (),
		"The source is not a file.");

var BUFFER_SIZE = 16384;

var BufferedReader = function (fileName, settings){
	EVENTS.EventEmitter.call (this);
	
	settings = settings || {};
	
	if (settings.bufferSize === 0) settings.bufferSize = -1;
	this._settings = {
		bufferSize: settings.bufferSize || BUFFER_SIZE,
		encoding: settings.encoding || null,
		start: settings.start || 0,
		end: settings.end
	};
	
	if (this._settings.bufferSize < 1) throw Error.get (Error.INVALID_BUFFER_SIZE);
	if (this._settings.start < 0) throw Error.get (Error.INVALID_START_OFFSET);
	if (this._settings.end < 0) throw Error.get (Error.INVALID_END_OFFSET);
	if (this._settings.end < this._settings.start) throw Error.get (Error.INVALID_RANGE_OFFSET);
	
	this._fileName = fileName;
	this._reset ();
};

BufferedReader.prototype = Object.create (EVENTS.EventEmitter.prototype);
BufferedReader.prototype.constructor = BufferedReader;

BufferedReader.prototype._init = function (cb){
	var me = this;
	FS.stat (this._fileName, function (error, stats){
		if (error) return cb (error);
		if (stats.isFile ()){
			if (me._settings.start >= stats.size){
				me._isEOF = true;
				return cb (null);
			}
			if (!me._settings.end && me._settings.end !== 0){
				me._settings.end = stats.size;
			}
			if (me._settings.end >= stats.size){
				me._settings.end = stats.size - 1;
			}
			me._fileSize = stats.size;
			cb (null);
		}else{
			cb (Error.get (Error.NO_FILE));
		}
	});
};

BufferedReader.prototype._read = function (cb){
	var me = this;
	var size = this._settings.bufferSize;
	FS.read (this._fd, this._buffer, 0, size, this._fileOffset, function (error, bytesRead){
		if (error) return cb (error);
		
		me._fileOffset += bytesRead;
		if (me._fileOffset === me._fileSize){
			me._noMoreBuffers = true;
		}
		if (bytesRead < size){
			me._buffer = me._buffer.slice (0, bytesRead);
		}
		cb (null);
	});
};

BufferedReader.prototype._readBytes = function (bytes, cb){
	if (this._needRead){
		this._needRead = false;
		var me = this;
		this._read (function (error){
			if (error) return cb (error, null, -1);
			me._readBytes (bytes, cb);
		});
		return;
	}

	var fill = function (){
		var endData = bytes - me._dataOffset;
		var endBuffer = me._buffer.length - me._bufferOffset;
		var end = endBuffer <= endData ? endBuffer : endData;
		
		me._buffer.copy (data, me._dataOffset, me._bufferOffset, me._bufferOffset + end);
		me._bufferOffset += end;
		me._realOffset += end;
		
		if (me._bufferOffset === me._buffer.length){
			me._bufferOffset = 0;
			me._needRead = true;
		}
		me._dataOffset += end;
		
		if (me._dataOffset === bytes){
			me._dataOffset = 0;
			me._isEOF = me._noMoreBuffers;
			cb (null, data, bytes);
		}else{
			if (me._noMoreBuffers){
				me._isEOF = true;
				end = me._dataOffset;
				me._dataOffset = 0;
				cb (null, data.slice (0, end), end);
			}else{
				me._needRead = false;
				me._read (function (error){
					if (error) return cb (error, null, -1);
					
					fill ();
				});
			}
		}
	};
	
	var me = this;

	var max = me._settings.end - me._realOffset + 1;
	bytes = max < bytes ? max : bytes;
	if (bytes === 0) return cb (null, null, 0);
	
	var data = new Buffer (bytes);
	var len = me._buffer.length;
	
	if (bytes <= len){
		var end = me._bufferOffset + bytes;
		
		if (end <= len){
			me._buffer.copy (data, 0, me._bufferOffset, end);
			me._bufferOffset = end;
			me._realOffset += bytes;
			cb (null, data, bytes);
		}else{
			var last = len - me._bufferOffset;
			me._realOffset += last;
			
			if (last !== 0){
				me._buffer.copy (data, 0, me._bufferOffset, me._bufferOffset + last);
			}
			if (me._noMoreBuffers){
				me._isEOF = true;
				return cb (null, data.slice (0, last), last);
			}
			
			me._read (function (error){
				if (error) return cb (error, null, -1);
				
				len = me._buffer.length;
				var remaining = bytes - last;
				if (len <= remaining){
					me._realOffset += len;
					me._isEOF = true;
					me._buffer.copy (data, last, 0, len);
					var lastChunk = last + len;
					cb (null, data.slice (0, lastChunk), lastChunk);
				}else{
					me._realOffset += remaining;
					me._bufferOffset = remaining;
					me._buffer.copy (data, last, 0, me._bufferOffset);
					cb (null, data, bytes);
				}
			});
		}
	}else{
		fill ();
	}
};

BufferedReader.prototype._reset = function (){
	this._fd = null;
	this._buffer = null;
	
	this._fileOffset = this._settings.start;
	this._bufferOffset = 0;
	this._dataOffset = 0;
	this._realOffset = this._settings.start;
	
	this._fileSize = null;
	this._initialized = false;
	this._interrupted = false;
	this._isEOF = false;
	this._noMoreBuffers = false;
	this._needRead = false;
	
	this._reading = false;
	this._stream = null;
};

BufferedReader.prototype.close = function (cb){
	if (cb) cb = cb.bind (this);
	if (!this._fd){
		if (cb) cb (null);
		return;
	}
	
	var me = this;
	FS.close (this._fd, function (error){
		me._reset ();
		if (cb) cb (error || null);
	});
};

BufferedReader.prototype.interrupt = function (){
	if (this._reading){
		this._interrupted = true;
	}
};

BufferedReader.prototype.pause = function (){
	if (this._stream) this._stream.pause ();
};

BufferedReader.prototype.read = function (){
	var me = this;

	FS.stat (this._fileName, function (error, stats){
		if (error) return me.emit ("error", error);
		
		me._reading = true;
		me._stream = FS.createReadStream (me._fileName, me._settings);
		if (me._writeStream) me._stream.pipe (me._writeStream);

		var lastChunk = null;
		var byteOffset = 0;
		var size = stats.size;
		
		var onChar = me.listeners ("character").length !== 0;
		var onLine = me.listeners ("line").length !== 0;
		var onByte = me.listeners ("byte").length !== 0;
		var loop = onChar || onLine || onByte;
		
		me._stream.on ("data", function (data){
			var offset = 0;
			var chunk;
			var character;
			var len = data.length;
			var isCR = false;
			
			if (loop){
				for (var i=0; i<len; i++){
					if (me._interrupted) break;
					
					character = data[i];
					if (!me._stream.encoding){
						byteOffset++;
						if (onByte){
							me.emit ("byte", character, byteOffset === size ? -1 : byteOffset);
						}
						continue;
					}
					
					byteOffset += Buffer.byteLength (character, me._settings.encoding);
					if (onChar){
						me.emit ("character", character, byteOffset === size ? -1 : byteOffset);
					}
					
					if (!onLine) continue;
					
					if (character === "\r"){
						isCR = true;
						continue;
					}
					
					if (character === "\n"){
						chunk = data.slice (offset, isCR ? i - 1 : i);
						offset = i + 1;
						
						if (lastChunk){
							chunk = lastChunk.concat (chunk);
							lastChunk = null;
						}
						
						me.emit ("line", chunk, byteOffset === size ? -1 : byteOffset);
					}
					
					isCR = false;
				}
				
				if (onLine && me._stream.encoding && offset !== len){
					var s = offset === 0 ? data : data.slice (offset);
					lastChunk = lastChunk ? lastChunk.concat (s) : s;
				}
			}else{
				byteOffset += len;
			}
			
			me.emit ("buffer", data, byteOffset === size ? -1 : byteOffset);
			if (me._interrupted){
				me._interrupted = false;
				me._stream.destroy ();
				me.emit ("end");
			}
		})
		.on ("end", function (){
			me._interrupted = false;
			if (loop && lastChunk){
				me.emit ("line", lastChunk, byteOffset);
			}
			me._reading = false;
			me._stream = null;
			me.emit ("end");
		})
		.on ("error", function (error){
			me._interrupted = false;
			me.emit ("error", error);
		});
	});
};

BufferedReader.prototype.readBytes = function (bytes, cb){
	cb = cb.bind (this);
	if (bytes < 1 || this._isEOF) return cb (null, null, 0);
	
	var open = function (){
		if (me._isEOF) return cb (null, null, 0);
		FS.open (me._fileName, "r", function (error, fd){
			if (error){
				me.close (function (error){
					cb (error, null, -1);
				});
				return;
			}
			
			me._fd = fd;
			me._buffer = new Buffer (me._settings.bufferSize);
			
			me._read (function (error){
				if (error){
					me.close (function (error){
						cb (error, null, -1);
					});
					return;
				}
				
				me._readBytes (bytes, function (error, bytes, bytesRead){
					if (error){
						me.close (function (error){
							cb (error, bytes, bytesRead);
						});
						return;
					}
					
					cb (error, bytes, bytesRead);
				});
			});
		});
	};
	
	var me = this;
	if (!this._initialized){
		this._init (function (error){
			if (error) return cb (error, null);
			me._initialized = true;
			open ();
		});
	}else{
		if (!this._fd) return open ();
		this._readBytes (bytes, cb);
	}
};

BufferedReader.prototype.resume = function (){
	if (this._stream) this._stream.resume ();
};

BufferedReader.prototype.seek = function (offset, cb){
	cb = cb.bind (this);
	if (offset < 0) return cb (Error.get (Error.INVALID_SEEK_OFFSET));
	
	var seek = function (){
		offset += me._settings.start;
		if (offset >= me._settings.end + 1){
			me._isEOF = true;
		}else{
			me._isEOF = false;
			var start = me._fileOffset - (me._buffer ? me._buffer.length : 0);
			if (offset >= start && offset < me._fileOffset){
				me._bufferOffset = offset - start;
				me._realOffset = offset;
			}else{
				me._needRead = me._fd ? true : false;
				me._noMoreBuffers = false;
				me._fileOffset = offset;
				me._bufferOffset = 0;
				me._realOffset = offset;
			}
		}
		cb (null);
	};
	
	var me = this;
	if (!this._initialized){
		this._init (function (error){
			if (error) return cb (error, null);
			me._initialized = true;
			seek ();
		});
	}else{
		seek ();
	}
};

BufferedReader.prototype.skip = function (bytes, cb){
	cb = cb.bind (this);
	if (bytes < 1 || this._isEOF) return cb (null, 0);
	
	var skip = function (){
		var remaining = me._settings.end - me._realOffset + 1;
		bytes = bytes <= remaining ? bytes : remaining;
		me.seek (me._realOffset - me._settings.start + bytes, function (){
			cb (null, bytes);
		});
	};
	
	var me = this;
	if (!this._initialized){
		this._init (function (error){
			if (error) return cb (error, null);
			me._initialized = true;
			skip ();
		});
	}else{
		skip ();
	}
};

module.exports = BufferedReader;