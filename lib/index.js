"use strict";

var hex = require ("hex");

var events = require ("events");
var util = require ("util");
var fs = require ("fs");
var dq = require ("deferred-queue");
var BinaryReaderError = require ("./error");

module.exports.open = function (p, options){
	//Lazy open, simply return a new instance
	return new Reader (p, options);
};

var Reader = function (path, options){
	events.EventEmitter.call (this);
	
	options = options || {};
	if (options.highWaterMark < 1){
		throw new BinaryReaderError ("Invalid highWaterMark");
	}
	this._highWaterMark = options.highWaterMark || 16384;
	
	this._path = path;
	this._fd = null;
	this._p = 0;
	this._b = null;
	//start and end are the absolute limits of the buffer
	this._start = 0;
	this._end = null;
	this._size = 0;
	//If bufferMode is false then file size <= buffer size and all the file is
	//read into memory, there's no need to check limits
	this._bufferMode = null;
	this._readFile = false;
	
	var me = this;
	
	this._q = dq.create ();
	this._q.on ("error", function (error){
		if (!me._fd){
			me._q = null;
			return me.emit ("error", error);
		}
		fs.close (me._fd, function (){
			//The close error is ignored
			me._fd = null;
			me._b = null;
			me._q = null;
			me.emit ("error", error);
		});
	});
};

util.inherits (Reader, events.EventEmitter);

Reader.prototype._open = function (cb){
	var me = this;
	fs.open (this._path, "r", function (error, fd){
		if (error) return cb (error);
		me._fd = fd;
		fs.fstat (fd, function (error, stats){
			if (error) return cb (error);
			me._size = stats.size;
			me._bufferMode = me._size > me._highWaterMark;
			cb ();
		});
	});
};

Reader.prototype.close = function (){
	if (!this._q) throw new BinaryReaderError ("The reader is closed");
	
	var me = this;
	
	this._q.push (function (done){
		if (!me._fd){
			me._q = null;
			return done ();
		}
		fs.close (me._fd, function (error){
			me._fd = null;
			me._b = null;
			me._q = null;
			done (error);
		});
	}, function (error){
		//If an error occurs the default error handler is not called because it
		//tries to close the file automatically, so if close() fails there would be
		//infinite calls to close()
		if (error){
			this.preventDefault ();
			me.emit ("error", error);
		}else{
			me.emit ("close");
		}
	});
};

Reader.prototype.isEOF = function (){
	if (!this._q) throw new BinaryReaderError ("The reader is closed");
	
	return this._p >= this._size;
};

Reader.prototype._read = function (bytes, cb){
	var me = this;
	
	if (!this._bufferMode){
		//File size <= buffer size
		if (!this._b) this._b = new Buffer (this._size);
		
		var read = function (){
			var bytesRead = me._p + bytes >= me._size ? me._size - me._p : bytes;
			var b = new Buffer (bytesRead);
			me._b.copy (b, 0, me._p, me._p + bytesRead);
			me._p += bytesRead;
			cb (null, bytesRead, b);
		};
		
		if (!this._readFile){
			//Read all the file
			fs.read (this._fd, this._b, 0, this._size, 0, function (error){
				if (error) return cb (error);
				me._readFile = true;
				read ();
			});
		}else{
			read ();
		}
	}else{
		//File size > buffer size
		if (!this._b) this._b = new Buffer (this._highWaterMark);
		console.log(12123)
		cb()
	}
	
	
	
	/*fs.read (this._fd, new Buffer (bytes), 0, bytes, this._p,
			function (error, bytesRead, buffer){
		if (error) return cb (error);
		me._p += bytesRead;
		cb (null, bytesRead, buffer.slice (0, bytesRead));
	});*/
};

Reader.prototype.read = function (bytes, cb){
	if (!this._q) throw new BinaryReaderError ("The reader is closed");
	
	var me = this;
	
	this._q.push (function (done){
		if (!me._fd){
			me._open (function (error){
				if (error) return done (error);
				me._read (bytes, done);
			});
		}else{
			me._read (bytes, done);
		}
	}, function (error, bytesRead, buffer){
		if (!error) cb (bytesRead, buffer);
	});
	
	return this;
};

Reader.prototype._seek = function (offset, whence, cb){
	if (!whence){
		whence = { start: true };
	}
	
	if (whence.start){
		this._p = offset;
	}else if (whence.current){
		this._p += offset;
	}else if (whence.end){
		this._p = this._size - 1 - offset;
	}
	
	//An offset beyond the size - 1 limit always return 0 bytes read, no need to
	//check and return an error
	if (this._p < 0){
		return cb (new BinaryReaderError ("The seek pointer must contain a " +
			"positive value"));
	}
	
	cb ();
};

Reader.prototype.seek = function (offset, whence, cb){
	if (!this._q) throw new BinaryReaderError ("The reader is closed");
	
	var me = this;
	
	if (arguments.length === 2 && typeof whence === "function"){
		cb = whence;
		whence = null;
	}
	
	this._q.push (function (done){
		if (!me._fd){
			me._open (function (error){
				if (error) return done (error);
				me._seek (offset, whence, done);
			});
		}else{
			me._seek (offset, whence, done);
		}
	}, function (error){
		if (!error && cb) cb ();
	});
	
	return this;
};

Reader.prototype.size = function (){
	if (!this._q) throw new BinaryReaderError ("The reader is closed");
	
	return this._size;
};

Reader.prototype.tell = function (){
	if (!this._q) throw new BinaryReaderError ("The reader is closed");
	
	return this._p;
};