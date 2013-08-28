"use strict";

var events = require ("events");
var util = require ("util");
var fs = require ("fs");
var dq = require ("deferred-queue");
var BinaryReaderError = require ("./error");

module.exports.create = function (p){
	return new Reader (p);
};

var Reader = function (path){
	events.EventEmitter.call (this);
	
	this._path = path;
	this._fd = null;
	this._p = 0;
	this._b = null;
	this._size = 0;
	this._cb = false;
	
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
			cb ();
		});
	});
};

Reader.prototype.close = function (){
	var me = this;
	
	if (this._cb){
		//The function is called inside the callback of an operation, close the
		//file immediately
		this._q.pause ();
		if (!this._fd){
			this._q = null;
			return this.emit ("close");
		}
		fs.close (this._fd, function (error){
			if (error) return me.emit ("error", error);
			me._fd = null;
			me._b = null;
			me._q = null;
			me.emit ("close");
		});
		return;
	}
	
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
	return this._p >= this._size;
};

Reader.prototype._read = function (bytes, done){
	var me = this;
	
	fs.read (this._fd, new Buffer (bytes), 0, bytes, this._p,
			function (error, bytesRead, buffer){
		if (error) return done (error);
		me._p += bytesRead;
		done (null, bytesRead, buffer.slice (0, bytesRead));
	});
};

Reader.prototype.read = function (bytes, cb){
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
		if (!error){
			me._cb = true;
			cb (bytesRead, buffer);
			me._cb = false;
		}
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
		return cb (new BinaryReaderError ("The seek pointer must be a positive " +
			"value"));
	}
	
	cb ();
};

Reader.prototype.seek = function (offset, whence, cb){
	var me = this;
	
	if (arguments.length === 2 && typeof whence === "function"){
		cb = whence;
		whence = null;
	}
	
	this._q.push (function (done){
		me._seek (offset, whence, done);
	}, function (error){
		if (!error && cb){
			me._cb = true;
			cb ();
			me._cb = false;
		}
	});
	
	return this;
};

Reader.prototype.size = function (){
	return this._size;
};

Reader.prototype.tell = function (){
	return this._p;
};