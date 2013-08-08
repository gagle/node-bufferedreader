"use strict";

var events = require ("events");
var fs = require ("fs");
var ep = require ("error-provider");

ep.create (ep.next (), "INVALID_BUFFER_SIZE", 
		"The buffer size must be greater than 0");
ep.create (ep.next (), "BINARY_DATA", 
		"Cannot configure a character or line listeners when the file is opened " +
		"without an encoding (read as binary data)");

var WIN = process.platform === "win32";
var BUFFER_SIZE = 16384;

var dr = module.exports = {};

dr.open = function (file, args){
	args = args || {};
	
	if (args.bufferSize === 0) args.bufferSize = -1;
	args.bufferSize = args.bufferSize || BUFFER_SIZE;
	if (args.bufferSize < 1) throw ep.get ("INVALID_BUFFER_SIZE");
	
	return new Reader (file, args);
};

var Reader = function (file, args){
	events.EventEmitter.call (this);
	
	this._bufferSize = args.bufferSize;
	this._encoding = args.encoding;
	this._file = file;
	this._reset ();
};

Reader.prototype = Object.create (events.EventEmitter.prototype);
Reader.prototype.constructor = Reader;

Reader.prototype._reset = function (){
	this._reading = false;
	this._paused = false;
	this._start = 0;
	//Last line not terminated with an EOL
	this._line = "";
	this._stream = null;
	//Previous loaded buffer
	this._buffer = null;
	//Previous index before pause
	this._index = 0;
};

Reader.prototype.stop = function (){
	if (!this._reading) return;
	this._stream.destroy ();
	this._reset ();
	this.emit ("end");
};

Reader.prototype.pause = function (){
	if (this._paused) return;
	this._paused = true;
	this._stream.destroy ();
};

Reader.prototype._emit = function (size){
	var me = this;
	
	var nextByteOffset = function (){
		return me._start === size ? -1 : me._start;
	};
	
	//Paused at the end of the file just before the end event
	if (this._start === size){
		this.emit ("end");
		return true;
	}
	//Paused after a buffer event, there's no more data to emit
	if (!this._buffer) return false;
				
	var len = this._buffer.length;
	var c;
	var isCR = false;
	var line;
	var lineOffset = 0;
	
	if (this._loop){
		for (var i=this._index; i<len; i++, this._index++){
			//Paused or stopped from a byte, character or line event
			if (!this._reading || this._paused) return false;
			
			c = this._buffer[i];
			
			if (!this._encoding){
				this._start++;
				this.emit ("byte", c, nextByteOffset ());
				continue;
			}
			
			this._start += Buffer.byteLength (c, this._encoding);
			this.emit ("character", c, nextByteOffset ());
			
			if (!this._listeners.onLine) continue;
			
			if (!WIN && c === "\r"){
				isCR = true;
				continue;
			}
			
			if (c === "\n"){
				line = this._buffer.substring (lineOffset, isCR ? i - 1 : i);
				lineOffset = i + 1;
				
				if (this._line){
					line = this._line + line;
					this._line = "";
				}
				
				this.emit ("line", line, nextByteOffset ());
			}
			
			isCR = false;
		}
		
		this._index = 0;
		
		if (this._listeners.onLine){
			this._line += this._buffer.substring (lineOffset);
		}
	}else{
		this._start += len;
	}
	
	var buffer = this._buffer;
	this._buffer = null;
	this.emit ("buffer", buffer, nextByteOffset ());
	
	return false;
};

Reader.prototype._readListeners = function (){
	if (this._listeners) return;
	this._listeners = {
		onByte: this.listeners ("byte").length !== 0,
		onChar: this.listeners ("character").length !== 0,
		onLine: this.listeners ("line").length !== 0,
	};
	this._loop = this._listeners.onChar || this._listeners.onLine ||
			this._listeners.onByte;
};

Reader.prototype.read = function (){
	if (this._reading && this._paused) return;
	this._reading = true;
	var me = this;
	
	this._readListeners ();
	
	if (!this._encoding && (this._listeners.onChar || this._listeners.onLine)){
		this.emit ("error", ep.get ("BINARY_DATA"));
		return;
	}
	
	fs.stat (this._file, function (error, stats){
		if (error) return me.emit ("error", error);
		
		var size = stats.size;
		
		if (size === 0) return me.emit ("end");
		
		//If the reader is paused the previous buffer contains valid data that
		//should be emitted
		//If all the file has been read the stream does not need to be re-created
		if (me._emit (size)) return;
		
		me._stream = fs.createReadStream (me._file, {
			bufferSize: me._bufferSize,
			encoding: me._encoding,
			start: me._start
		});
		
		me._stream
				.on ("error", function (error){
					me._stream.destroy ();
					me.emit ("error", error);
				})
				.on ("end", function (){
					if (me._line){
						me.emit ("line", me._line, -1);
					}
					me._reset ();
					me.emit ("end");
				})
				.on ("data", function (buffer){
					me._buffer = buffer;
					me._emit ();
				});
	});
};

Reader.prototype.resume = function (){
	if (!this._paused) return;
	this._paused = false;
	this.read ();
};