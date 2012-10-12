/**
 * @name BufferedReader.
 * @description Binary and event-based data buffered readers.
 *
 * @author Gabriel Llamas
 * @created 10/04/2012
 * @modified 12/10/2012
 * @version 1.0.1
 */
"use strict";

var EVENTS = require ("events");
var FS = require ("fs");

var Error = require ("errno-codes");

Error.create (Error.getNextAvailableErrno (), "INVALID_BUFFER_SIZE", 
		"The buffer size must be greater than 0.");
Error.create (Error.getNextAvailableErrno (), "INVALID_WINDOW_START_OFFSET", 
		"The start offset must be greater than or equals to 0.");
Error.create (Error.getNextAvailableErrno (), "INVALID_WINDOW_END_OFFSET", 
		"The end offset must be greater than or equals to 0.");
Error.create (Error.getNextAvailableErrno (), "INVALID_WINDOW_RANGE_OFFSET", 
		"The end offset must be greater than or equals to the start offset and both of them must" +
		" be inside the file range. Window: [{ws}, {we}], File: [0, {fe}].");
Error.create (Error.getNextAvailableErrno (), "INVALID_SEEK_OFFSET", 
		"The relative offset must be inside the window range. Relative offset: {offset}, Relative" +
		" window: [0, {we}].");
Error.create (Error.getNextAvailableErrno (), "NO_FILE", 
		"The source is not a file.");
Error.create (Error.getNextAvailableErrno (), "EMPTY_FILE", 
		"The file is empty.");
Error.create (Error.getNextAvailableErrno (), "INVALID_READ_BYTES", 
		"The number of bytes to read must be equal or greater than 1.");

var File = function (name){
	this._name = name;
	this._fd = null;
	this.size = null;
	this.isFile = null;
};

File.prototype.readMetadata = function (cb){
	var me = this;
	FS.stat (this._name, function (error, stats){
		if (error) return cb (error);
		if (stats.size === 0) return cb (Error.get (Error.EMPTY_FILE));
		me.size = stats.size;
		me.isFile = stats.isFile ();
		cb (null);
	});
};

File.prototype.close = function (cb){
	if (this._fd === null) return cb (null);
	
	FS.close (this._fd, function (error){
		cb (error || null);
	});
};

File.prototype.open = function (cb){
	if (this._fd !== null) return cb (null, this._fd);
	
	var me = this;
	FS.open (this._name, "r", function (error, fd){
		if (error) return cb (error, null);
		
		me._fd = fd;
		cb (null, fd);
	});
};

var Frame = function (br, size){
	if (size < 1){
		throw Error.get (Error.INVALID_BUFFER_SIZE);
	}else if (size === undefined || size === null){
		size = Frame.DEFAULT_SIZE;
	}
	
	this._bufferedReader = br;
	this._buffer = null;
	this._size = size;
	
	//Offsets que marcan el rango de bytes validos que se encuentra en el frame
	this._fileStart = null;
	this._fileEnd = null;
};

Frame.DEFAULT_SIZE = 16384;

Frame.prototype.toFrameOffset = function (offset){
	return offset - this._fileStart;
};

Frame.prototype.isInside = function (offset){
	return this._buffer === null ? false : offset >= this._fileStart && offset <= this._fileEnd;
};

Frame.prototype.isLastFrame = function (){
	return this._buffer === null ? false : this._fileEnd === this._bufferedReader._window._end;
};

Frame.prototype.length = function (){
	return this._fileEnd - this._fileStart + 1;
};

Frame.prototype.read = function (cb){
	if (this._buffer === null){
		this._buffer = new Buffer (this._size);
	}
	
	var me = this;
	
	this._bufferedReader._file.open (function (error, fd){
		if (error) return cb (error);
		
		var length = me._bufferedReader._window._end - me._bufferedReader._globalOffset + 1;
		if (length > me._size){
			length = me._size;
		}
		
		FS.read (fd, me._buffer, 0, length, me._bufferedReader._globalOffset,
				function (error, bytesRead){
			if (error) return cb (error);
			
			me._fileStart = me._bufferedReader._globalOffset;
			me._fileEnd = me._fileStart + bytesRead - 1;
			
			cb (null);
		});
	});
};

var Window = function (start, end, fromEnd){
	if (!fromEnd){
		if (start === undefined || start === null){
			start = 0;
		}
		
		if (start < 0) throw Error.get (Error.INVALID_WINDOW_START_OFFSET);
		if (end < 0) throw Error.get (Error.INVALID_WINDOW_END_OFFSET);
		if ((start > end) && end !== undefined && end !== null){
			throw Error.get (Error.INVALID_WINDOW_RANGE_OFFSET,
					{ ws: start, we: end, fe: undefined });
		}
	}else{
		if ((end > start) && end !== undefined && end !== null &&
				start !== undefined && start !== null){
			throw Error.get (Error.INVALID_WINDOW_RANGE_OFFSET,
					{ ws: start, we: end, fe: undefined });
		}
	}
	
	this._fromEnd = fromEnd;
	this._start = start;
	this._end = end;
};

Window.prototype.toAbsoluteOffset = function (relativeOffset){
	if (relativeOffset === BinaryReader.START_OF_WINDOW){
		return this._start;
	}else if (relativeOffset === BinaryReader.END_OF_WINDOW){
		return this._end;
	}
	return this._start + relativeOffset;
};

Window.prototype.isInside = function (relativeOffset){
	if (relativeOffset === BinaryReader.START_OF_WINDOW ||
			relativeOffset === BinaryReader.END_OF_WINDOW){
		return true;
	}
	return relativeOffset >= 0 && relativeOffset <= this._end - this._start;
};

Window.prototype.setEnd = function (end){
	if (this._fromEnd){
		this._start = this._start !== undefined && this._start !== null ? end - this._start : end;
		this._end = this._end !== undefined && this._end !== null ? end - this._end : end;
		
		if (this._start > this._end){
			return Error.get (Error.INVALID_WINDOW_RANGE_OFFSET,
					{ ws: this._start, we: this._end, fe: end });
		}
	}else{
		if (this._end === undefined || this._end === null){
			if (this._start > end){
				return Error.get (Error.INVALID_WINDOW_RANGE_OFFSET,
						{ ws: this._start, we: this._end, fe: end });
			}
			
			this._end = end;
		}
	}
	
	return null;
};

var DataReader = function (fileName, settings){
	EVENTS.EventEmitter.call (this);
	
	settings = settings || {};
	
	if (settings.bufferSize === 0) settings.bufferSize = -1;
	
	if (settings.bufferSize < 1){
		throw Error.get (Error.INVALID_BUFFER_SIZE);
	}else if (settings.bufferSize === undefined || settings.bufferSize === null){
		settings.bufferSize = Frame.DEFAULT_SIZE;
	}
	
	this._settings = {
		encoding: settings.encoding || null,
		bufferSize: settings.bufferSize,
		start: 0
	};
	this._fileName = fileName;
	this._stream = null;
	this._reading = false;
	this._interrupted = false;
	this._paused = false;
	
	//Guarda la ultima porcion de linea del buffer que no se ha devuelto al usuario porque no
	//termina en \n
	this._line = null;
};

DataReader.prototype = Object.create (EVENTS.EventEmitter.prototype);
DataReader.prototype.constructor = DataReader;

DataReader.prototype.interrupt = function (){
	if (!this._interrupted){
		if (this._paused){
			this._paused = false;
			this._line = null;
			this._settings.start = 0;
			this._line = null;
			this.emit ("end");
		}else{
			this._interrupted = true;
			this._reading = false;
		}
	}
};

DataReader.prototype.pause = function (){
	if (!this._paused){
		this._paused = true;
		this._reading = false;
	}
};

DataReader.prototype.read = function (){
	if (this._reading) return;
	
	this._reading = true;
	var me = this;
	
	FS.stat (this._fileName, function (error, stats){
		if (error) return me.emit ("error", error);
		
		me._stream = FS.createReadStream (me._fileName, me._settings);
		
		var size = stats.size;
		
		var onByte = me.listeners ("byte").length !== 0;
		var onChar = me.listeners ("character").length !== 0;
		var onLine = me.listeners ("line").length !== 0;
		var loop = onChar || onLine || onByte;
		
		var getNextByteOffset = function (){
			return me._settings.start === size ? -1 : me._settings.start;
		};
		
		me._stream
				.on ("error", function (error){
					me.emit ("error", error);
					me._reading = false;
					me._interrupted = false;
					me._paused = false;
					me._line = null;
					me._settings.start = 0;
				})
				.on ("end", function (){
					if (me._line){
						//Hay una linea guardada que no se ha devuelto al usuario porque es la
						//ultima del archivo y no termina en \n
						me.emit ("line", me._line, -1);
					}
					me._reading = false;
					me._interrupted = false;
					me._paused = false;
					me._line = null;
					me._settings.start = 0;
					me._line = null;
					me.emit ("end");
				})
				.on ("data", function (buffer){
					var c;
					var isCR = false;
					var line;
					var startLineOffset = 0;
					var bufferLength = buffer.length;
					
					if (loop){
						for (var i=0; i<bufferLength; i++){
							if (me._interrupted || me._paused) break;
							
							c = buffer[i];
							
							if (!me._settings.encoding){
								me._settings.start++;
								me.emit ("byte", c, getNextByteOffset ());
								continue;
							}
							
							me._settings.start += Buffer.byteLength (c, me._settings.encoding);
							me.emit ("character", c, getNextByteOffset ());
							
							if (!onLine) continue;
							
							if (c === "\r"){
								isCR = true;
								continue;
							}
							
							if (c === "\n"){
								line = buffer.substring (startLineOffset, isCR ? i - 1 : i);
								startLineOffset = i + 1;
								
								if (me._line){
									line = me._line + line;
									me._line = null;
								}
								
								me.emit ("line", line, getNextByteOffset ());
							}
							
							isCR = false;
						}
						
						//Compruebo si hay que guardar la linea porque no termina en \n
						if (onLine && me._settings.encoding && startLineOffset !== size &&
								!me._paused && !me._interrupted){
							line = startLineOffset !== 0 ?
									buffer.substring (startLineOffset) :
									buffer;
							me._line = me._line ? me._line + line : line;
						}
					}else{
						me._settings.start += bufferLength;
					}
					
					if (me._interrupt || me._pause) buffer = buffer.slice (0, me._settings.start);
					me.emit ("buffer", buffer, getNextByteOffset ());
					
					if (me._interrupted){
						me._interrupted = false;
						me._line = null;
						me._stream.destroy ();
						me.emit ("end");
					}else if (me._paused){
						me._stream.destroy ();
					}
				});
	});
};

DataReader.prototype.resume = function (){
	if (this._paused){
		this._paused = false;
		this.read ();
	}
};

var BinaryReader = function (fileName, settings){
	settings = settings || {};
	
	if (settings.bufferSize === 0) settings.bufferSize = -1;
	
	this._window = new Window (settings.start, settings.end, settings.fromEnd);
	this._file = new File (fileName);
	this._frame = new Frame (this, settings.bufferSize);
	this._initialized = false;
	
	//Offset que apunta a un byte de la totalidad del archivo y que marca desde donde hacer la
	//proxima lectura
	this._globalOffset = null;
};

BinaryReader.START_OF_WINDOW = {};
BinaryReader.END_OF_WINDOW = {};

BinaryReader.prototype._init = function (cb){
	if (!this._initialized){
		var me = this;
		
		this._file.readMetadata (function (error){
			if (error) return cb (error);
			
			if (me._file.isFile){
				var error = null;
				
				//Si no hay limite final de ventana, dicho limite pasa a ser el final del archivo
				error = me._window.setEnd (me._file.size - 1);
				me._globalOffset = me._window._start;
				if (!error) me._initialized = true;
				cb (error);
			}else{
				cb (Error.get (Error.NO_FILE));
			}
		});
	}else{
		cb (null);
	}
};

BinaryReader.prototype.close = function (cb){
	cb = cb.bind (this);
	this._file.close (function (error){
		cb (error || null);
	});
};

BinaryReader.prototype.getOffset = function (){
	return this._globalOffset;
};

BinaryReader.prototype.isOffsetOutOfWindow = function (){
	return this._globalOffset == -1;
};

BinaryReader.prototype.read = function (bytes, cb){
	cb = cb.bind (this);
	if (bytes < 1) return cb (Error.get (Error.INVALID_READ_BYTES), null, 0);
	if (this.isOffsetOutOfWindow ()) return cb (null, new Buffer (0), 0);
	
	//Corrijo la cantidad de bytes a leer segun el tamaño de la ventana
	var remainingFileBytes = this._window._end - this._globalOffset + 1;
	if (bytes > remainingFileBytes) bytes = remainingFileBytes;
	var targetBuffer = new Buffer (bytes);
	
	var me = this;
	
	var copy = function (){
		//Copio el contenido del frame al buffer de retorno
		var targetStart = 0;
		var bytesToRead = bytes;
		var sourceEnd = me._globalOffset + bytes - 1;
		var secondRead = false;
		
		if (sourceEnd > me._frame._fileEnd){
			secondRead = true;
			sourceEnd = me._frame._fileEnd;
		}
		
		//Copio la primera o unica parte
		me._frame._buffer.copy (targetBuffer, targetStart,
				me._frame.toFrameOffset (me._globalOffset),
				me._frame.toFrameOffset (sourceEnd + 1));
		
		var bytesWritten = sourceEnd - me._globalOffset + 1;
		bytesToRead -= bytesWritten;
		targetStart += bytesWritten;
		
		if (secondRead){
			me._globalOffset += bytesWritten;
			
			me._frame.read (function (error){
				if (error) return cb (error, null, null);
				
				me._frame._buffer.copy (targetBuffer, targetStart, 0, bytesToRead);
				me._globalOffset += bytesToRead;
				if (me._globalOffset === me._window._end + 1){
					me._globalOffset = -1;
				}
				
				cb (null, targetBuffer, bytes);
			});
		}else{
			me._globalOffset += bytes;
			if (me._globalOffset === me._window._end + 1){
				me._globalOffset = -1;
			}
			
			cb (null, targetBuffer, bytes);
		}
	};
	
	var fill = function (remainingBytes, targetStart){
		if (me._globalOffset > me._frame._fileEnd){
			me._frame.read (function (error){
				if (error) return cb (error, null, 0);
				fill (remainingBytes, targetStart);
			});
			return;
		}
	
		//Cada vez que se llama a esta funcion hay que preguntarse: cuantos bytes hay que leer
		//del frame actual?
		var bytesToRead = me._frame._fileEnd - me._globalOffset + 1;
		if (bytesToRead > remainingBytes){
			bytesToRead = remainingBytes;
		}
		
		var relativeOffset = me._frame.toFrameOffset (me._globalOffset);
		
		me._frame._buffer.copy (targetBuffer, targetStart, relativeOffset,
				relativeOffset + bytesToRead);
		
		me._globalOffset += bytesToRead;
		targetStart += bytesToRead;
		remainingBytes -= bytesToRead;
		
		if (remainingBytes === 0) return cb (null, targetBuffer, bytes);
		fill (remainingBytes, targetStart);
	};
	
	var read = function (){
		/*
			Si los bytes que se quieren leer superan el limite de la ventana automaticamente se
			se acortan al limite de esta, por tanto, en los siguientes casos el numero de bytes
			siempre sera un valor valido dentro de la ventana.
			
			Hay 2 casos:
			
			(1) La cantidad de bytes a leer es menor o igual que el tamaño del frame.
				Es posible que se tenga que volver a hacer otra lectura porque los bytes a leer
				pueden estar entre 2 lecturas de frame.
				
				Frame de 4 bytes:				b0.b1.b2.b3
				Offset global:					b2
				Bytes que se quieren leer:		4
				Bytes que se tienen que leer:	b2.b3, lectura, b4.b5
			
			(2) La cantidad de bytes a leer es mayor que el tamaño del frame.
				Hay que ir haciendo lecturas e ir guardandolas en el buffer de retorno hasta que
				este se llene o se llegue al final de la ventana.
				
				Frame de 4 bytes:				b0.b1.b2.b3
				Offset global:					b2
				Bytes que se quieren leer:		10
				Bytes que se tienen que leer:	b2.b3, lectura, b4.b5.b6.b7, lectura, b8.b9.b10.11
		*/
		
		if (bytes <= me._frame.length ()){
			//Caso 1
			copy ();
		}else{
			//Caso 2
			fill (bytes, 0);
		}
	};
	
	this._init (function (error){
		if (error) return cb (error);
		
		if (!me._frame.isInside (me._globalOffset)){
			me._frame.read (function (error){
				if (error) return cb (error, null, 0);
				read ();
			});
		}else{
			read ();
		}
	});
};

BinaryReader.prototype.seek = function (offset, cb){
	cb = cb.bind (this);
	var me = this;
	
	this._init (function (error){
		if (error) return cb (error);
		
		if (me._window.isInside (offset)){
			me._globalOffset = me._window.toAbsoluteOffset (offset);
			cb (null);
		}else{
			cb (Error.get (Error.INVALID_SEEK_OFFSET,
					{ offset: offset, we: me._window._end - me._window._start }));
		}
	});
};

BinaryReader.prototype.skip = function (bytes, cb){
	cb = cb.bind (this);
	var me = this;
	
	if (bytes === 0 || this.isOffsetOutOfWindow ()) return cb (null, 0);
	
	this._init (function (error){
		if (error) return cb (error, null);
		
		var offset = me._globalOffset + bytes;
		if (offset > me._window._end){
			offset = me._window._end;
			bytes = me._window._end - me._globalOffset;
		}else if (offset < me._window._start){
			offset = me._window._start;
			bytes = me._window._start - me._globalOffset;
		}
		me._globalOffset = offset;
		
		cb (null, bytes);
	});
};

var Deprecated = function (fileName, settings){
	DataReader.call (this, fileName, settings);
	BinaryReader.call (this, fileName, settings);
	
	console.log ("The BufferedReader function has been deprecated. Use DataReader or " +
			"BinaryReader.\n");
};
Deprecated.prototype.interrupt = DataReader.prototype.interrupt;
Deprecated.prototype.pause = DataReader.prototype.pause;
Deprecated.prototype.read = DataReader.prototype.read;
Deprecated.prototype.resume = DataReader.prototype.resume;

Deprecated.prototype.close = BinaryReader.prototype.close;
Deprecated.prototype.readBytes = BinaryReader.prototype.read;
Deprecated.prototype.seek = BinaryReader.prototype.seek;
Deprecated.prototype.skip = BinaryReader.prototype.skip;

Deprecated.prototype._init = BinaryReader.prototype._init;
Deprecated.prototype.isOffsetOutOfWindow = BinaryReader.prototype.isOffsetOutOfWindow;


Deprecated.DataReader = DataReader;
Deprecated.BinaryReader = BinaryReader;

module.exports = Deprecated;