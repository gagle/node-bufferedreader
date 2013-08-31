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
	this._s = -1;
	this._e = -1;
	this._size = null;
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
	
	return this;
};

Reader.prototype.isEOF = function (){
	if (!this._q) throw new BinaryReaderError ("The reader is closed");
	
	return this._p >= this._size;
};

Reader.prototype._inside = function (p){
	return p >= this._s && p < this._e;
};

Reader.prototype._dump = function (target, offset, start, end, cb){
	var me = this;
	
	var reads = Math.ceil ((end - start)/this._highWaterMark);
	var last = (end - start)%this._highWaterMark || this._highWaterMark;
	
	(function read (reads){
		if (reads === 1){
			//Read to the buffer and copy to the target
			fs.read (me._fd, me._b, 0, me._highWaterMark, start,
					function (error, bytesRead){
				if (error) return cb (error);
				
				//Update the buffer limits
				me._s = start;
				me._e = start + bytesRead;
				
				//Fill the target buffer
				me._b.copy (target, offset, 0, last);
				
				cb ();
			});
		}else{
			//Read to the target
			fs.read (me._fd, target, offset, me._highWaterMark, start,
					function (error, bytesRead){
				if (error) return cb (error);
				
				offset += bytesRead;
				start += bytesRead;
				
				read (reads - 1);
			});
		}
	})(reads);
};

Reader.prototype._read = function (bytes, cb){
	var me = this;
	
	//Trim the number of bytes to read
	if (this._p + bytes >= this._size){
		bytes = this._size - this._p;
	}
	
	var target = new Buffer (bytes);
	
	if (!this._bufferMode){
		//File size <= buffer size
		if (!this._b) this._b = new Buffer (this._size);
		
		var read = function (){
			me._b.copy (target, 0, me._p, me._p + bytes);
			me._p += bytes;
			cb (null, bytes, target);
		};
		
		if (!this._readFile){
			//Read all the file
			fs.read (this._fd, this._b, 0, this._size, 0, function (error){
				if (error) return cb (error);
				me._readFile = true;
				//start and end limits don't need to be updated, they're not used
				read ();
			});
		}else{
			read ();
		}
	}else{
		//File size > buffer size
		if (!this._b) this._b = new Buffer (this._highWaterMark);
		
		var s = this._p;
		var e = this._p + bytes;
		var is = this._inside (s);
		var ie = this._inside (e);
		
		if (is && ie){console.log("case1")
			//Case 1
			//The bytes to read are already in the buffer
			this._b.copy (target, 0, s - me._s, s - me._s + bytes);
			this._p += bytes;
			cb (null, bytes, target);
		}else if (!is && !ie && !(this._s >= s && this._s <= e)){console.log("case2")
			//Case 2
			//This is also the case of the very first read
			this._dump (target, 0, s, e, function (error){
				if (error) return cb (error);
				me._p += bytes;
				cb (null, bytes, target);
			});
		}else if (is && !ie){console.log("case3")
			//Case 3
			//Copy the first bytes already in the buffer
			this._b.copy (target, 0, s - me._s, this._e - me._s);
			//Read the last bytes
			this._dump (target, this._e - s, this._e, e, function (error){
				if (error) return cb (error);
				me._p += bytes;
				cb (null, bytes, target);
			});
		}else if (!is && ie){console.log("case4")
			//Case 4
			//Copy the last bytes already in the buffer
			this._b.copy (target, me._s - s, 0, e - me._s);
			//Read the first bytes
			this._dump (target, 0, s, this._s, function (error){
				if (error) return cb (error);
				me._p += bytes;
				cb (null, bytes, target);
			});
		}
	}
};

Reader.prototype.read = function (bytes, cb){
	if (!this._q) throw new BinaryReaderError ("The reader is closed");
	if (bytes < 1) throw new BinaryReaderError ("Must read one or more bytes");
	
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

Reader.prototype.debug = function (){
	return {
		file: {
			path: this._path,
			fd: this._fd,
			size: this._size
		},
		buffer: {
			size: this._highWaterMark,
			start: this._s,
			end: this._e
		},
		cursor: {
			index: this._p,
			isEOF: this._p >= this._size
		},
		closed: !this._q
	}
};