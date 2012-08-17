"use strict";var EVENTS=require("events"),FS=require("fs"),Error=require("errno-codes");Error.create("INVALID_BUFFER_SIZE",Error.getNextAvailableErrno(),"The buffer size must be greater than 0."),Error.create("INVALID_START_OFFSET",Error.getNextAvailableErrno(),"The start offset must be greater than or equals to 0."),Error.create("INVALID_END_OFFSET",Error.getNextAvailableErrno(),"The end offset must be greater than or equals to 0."),Error.create("INVALID_RANGE_OFFSET",Error.getNextAvailableErrno(),"The end offset must be greater than or equals to the start offset."),Error.create("INVALID_BYTES_RANGE_ERROR",Error.getNextAvailableErrno(),"The number of bytes to read must be greater than 0."),Error.create("INVALID_SEEK_OFFSET",Error.getNextAvailableErrno(),"The offset must be greater than or equals to 0."),Error.create("NO_FILE",Error.getNextAvailableErrno(),"The source is not a file.");var BUFFER_SIZE=16384,BufferedReader=function(e,t){EVENTS.EventEmitter.call(this),t=t||{},t.bufferSize===0&&(t.bufferSize=-1),this._settings={bufferSize:t.bufferSize||BUFFER_SIZE,encoding:t.encoding||null,start:t.start||0,end:t.end};if(this._settings.bufferSize<1)throw Error.get(Error.INVALID_BUFFER_SIZE);if(this._settings.start<0)throw Error.get(Error.INVALID_START_OFFSET);if(this._settings.end<0)throw Error.get(Error.INVALID_END_OFFSET);if(this._settings.end<this._settings.start)throw Error.get(Error.INVALID_RANGE_OFFSET);this._fileName=e,this._reset()};BufferedReader.prototype=Object.create(EVENTS.EventEmitter.prototype),BufferedReader.prototype.constructor=BufferedReader,BufferedReader.prototype._init=function(e){var t=this;FS.stat(this._fileName,function(n,r){if(n)return e(n);if(r.isFile()){if(t._settings.start>=r.size)return t._isEOF=!0,e(null);!t._settings.end&&t._settings.end!==0&&(t._settings.end=r.size),t._settings.end>=r.size&&(t._settings.end=r.size-1),t._fileSize=r.size,e(null)}else e(Error.get(Error.NO_FILE))})},BufferedReader.prototype._read=function(e){var t=this,n=this._settings.bufferSize;FS.read(this._fd,this._buffer,0,n,this._fileOffset,function(r,i){if(r)return e(r);t._fileOffset+=i,t._fileOffset===t._fileSize&&(t._noMoreBuffers=!0),i<n&&(t._buffer=t._buffer.slice(0,i)),e(null)})},BufferedReader.prototype._readBytes=function(e,t){if(this._needRead){this._needRead=!1;var n=this;this._read(function(r){if(r)return t(r,null,-1);n._readBytes(e,t)});return}var r=function(){var i=e-n._dataOffset,o=n._buffer.length-n._bufferOffset,u=o<=i?o:i;n._buffer.copy(s,n._dataOffset,n._bufferOffset,n._bufferOffset+u),n._bufferOffset+=u,n._realOffset+=u,n._bufferOffset===n._buffer.length&&(n._bufferOffset=0,n._needRead=!0),n._dataOffset+=u,n._dataOffset===e?(n._dataOffset=0,n._isEOF=n._noMoreBuffers,t(null,s,e)):n._noMoreBuffers?(n._isEOF=!0,u=n._dataOffset,n._dataOffset=0,t(null,s.slice(0,u),u)):(n._needRead=!1,n._read(function(e){if(e)return t(e,null,-1);r()}))},n=this,i=n._settings.end-n._realOffset+1;e=i<e?i:e;if(e===0)return t(null,null,0);var s=new Buffer(e),o=n._buffer.length;if(e<=o){var u=n._bufferOffset+e;if(u<=o)n._buffer.copy(s,0,n._bufferOffset,u),n._bufferOffset=u,n._realOffset+=e,t(null,s,e);else{var a=o-n._bufferOffset;n._realOffset+=a,a!==0&&n._buffer.copy(s,0,n._bufferOffset,n._bufferOffset+a);if(n._noMoreBuffers)return n._isEOF=!0,t(null,s.slice(0,a),a);n._read(function(r){if(r)return t(r,null,-1);o=n._buffer.length;var i=e-a;if(o<=i){n._realOffset+=o,n._isEOF=!0,n._buffer.copy(s,a,0,o);var u=a+o;t(null,s.slice(0,u),u)}else n._realOffset+=i,n._bufferOffset=i,n._buffer.copy(s,a,0,n._bufferOffset),t(null,s,e)})}}else r()},BufferedReader.prototype._reset=function(){this._fd=null,this._buffer=null,this._fileOffset=this._settings.start,this._bufferOffset=0,this._dataOffset=0,this._realOffset=this._settings.start,this._fileSize=null,this._initialized=!1,this._interrupted=!1,this._isEOF=!1,this._noMoreBuffers=!1,this._needRead=!1,this._reading=!1,this._stream=null},BufferedReader.prototype.close=function(e){e&&(e=e.bind(this));if(!this._fd){e&&e(null);return}var t=this;FS.close(this._fd,function(n){t._reset(),e&&e(n||null)})},BufferedReader.prototype.interrupt=function(){this._reading&&(this._interrupted=!0)},BufferedReader.prototype.pause=function(){this._stream&&this._stream.pause()},BufferedReader.prototype.read=function(){var e=this;FS.stat(this._fileName,function(t,n){if(t)return e.emit("error",t);e._reading=!0,e._stream=FS.createReadStream(e._fileName,e._settings),e._writeStream&&e._stream.pipe(e._writeStream);var r=null,i=0,s=n.size,o=e.listeners("character").length!==0,u=e.listeners("line").length!==0,a=e.listeners("byte").length!==0,f=o||u||a;e._stream.on("data",function(t){var n=0,l,c,h=t.length,p=!1;if(f){for(var d=0;d<h;d++){if(e._interrupted)break;c=t[d];if(!e._stream.encoding){i++,a&&e.emit("byte",c,i===s?-1:i);continue}i+=Buffer.byteLength(c,e._settings.encoding),o&&e.emit("character",c,i===s?-1:i);if(!u)continue;if(c==="\r"){p=!0;continue}c==="\n"&&(l=t.slice(n,p?d-1:d),n=d+1,r&&(l=r.concat(l),r=null),e.emit("line",l,i===s?-1:i)),p=!1}if(u&&e._stream.encoding&&n!==h){var v=n===0?t:t.slice(n);r=r?r.concat(v):v}}else i+=h;e.emit("buffer",t,i===s?-1:i),e._interrupted&&(e._interrupted=!1,e._stream.destroy(),e.emit("end"))}).on("end",function(){e._interrupted=!1,f&&r&&e.emit("line",r,i),e._reading=!1,e._stream=null,e.emit("end")}).on("error",function(t){e._interrupted=!1,e.emit("error",t)})})},BufferedReader.prototype.readBytes=function(e,t){t=t.bind(this);if(e<1||this._isEOF)return t(null,null,0);var n=function(){if(r._isEOF)return t(null,null,0);FS.open(r._fileName,"r",function(n,i){if(n){r.close(function(e){t(e,null,-1)});return}r._fd=i,r._buffer=new Buffer(r._settings.bufferSize),r._read(function(n){if(n){r.close(function(e){t(e,null,-1)});return}r._readBytes(e,function(e,n,i){if(e){r.close(function(e){t(e,n,i)});return}t(e,n,i)})})})},r=this;if(!this._initialized)this._init(function(e){if(e)return t(e,null);r._initialized=!0,n()});else{if(!this._fd)return n();this._readBytes(e,t)}},BufferedReader.prototype.resume=function(){this._stream&&this._stream.resume()},BufferedReader.prototype.seek=function(e,t){t=t.bind(this);if(e<0)return t(Error.get(Error.INVALID_SEEK_OFFSET));var n=function(){e+=r._settings.start;if(e>=r._settings.end+1)r._isEOF=!0;else{r._isEOF=!1;var n=r._fileOffset-(r._buffer?r._buffer.length:0);e>=n&&e<r._fileOffset?(r._bufferOffset=e-n,r._realOffset=e):(r._needRead=r._fd?!0:!1,r._noMoreBuffers=!1,r._fileOffset=e,r._bufferOffset=0,r._realOffset=e)}t(null)},r=this;this._initialized?n():this._init(function(e){if(e)return t(e,null);r._initialized=!0,n()})},BufferedReader.prototype.skip=function(e,t){t=t.bind(this);if(e<1||this._isEOF)return t(null,0);var n=function(){var n=r._settings.end-r._realOffset+1;e=e<=n?e:n,r.seek(r._realOffset-r._settings.start+e,function(){t(null,e)})},r=this;this._initialized?n():this._init(function(e){if(e)return t(e,null);r._initialized=!0,n()})},module.exports=BufferedReader;