"use strict";var EVENTS=require("events"),FS=require("fs"),Error=require("errno-codes");Error.create(Error.getNextAvailableErrno(),"INVALID_BUFFER_SIZE","The buffer size must be greater than 0."),Error.create(Error.getNextAvailableErrno(),"INVALID_WINDOW_START_OFFSET","The start offset must be greater than or equals to 0."),Error.create(Error.getNextAvailableErrno(),"INVALID_WINDOW_END_OFFSET","The end offset must be greater than or equals to 0."),Error.create(Error.getNextAvailableErrno(),"INVALID_WINDOW_RANGE_OFFSET","The end offset must be greater than or equals to the start offset and both of them must be inside the file range. Window: [{ws}, {we}], File: [0, {fe}]."),Error.create(Error.getNextAvailableErrno(),"INVALID_SEEK_OFFSET","The relative offset must be inside the window range. Relative offset: {offset}, Relative window: [0, {we}]."),Error.create(Error.getNextAvailableErrno(),"NO_FILE","The source is not a file."),Error.create(Error.getNextAvailableErrno(),"EMPTY_FILE","The file is empty."),Error.create(Error.getNextAvailableErrno(),"INVALID_READ_BYTES","The number of bytes to read must be equal or greater than 1.");var File=function(a){this._name=a,this._fd=null,this.size=null,this.isFile=null};File.prototype.readMetadata=function(a){var b=this;FS.stat(this._name,function(c,d){if(c)return a(c);if(d.size===0)return a(Error.get(Error.EMPTY_FILE));b.size=d.size,b.isFile=d.isFile(),a(null)})},File.prototype.close=function(a){if(this._fd===null)return a(null);FS.close(this._fd,function(b){a(b||null)})},File.prototype.open=function(a){if(this._fd!==null)return a(null,this._fd);var b=this;FS.open(this._name,"r",function(c,d){if(c)return a(c,null);b._fd=d,a(null,d)})};var Frame=function(a,b){if(b<1)throw Error.get(Error.INVALID_BUFFER_SIZE);if(b===undefined||b===null)b=Frame.DEFAULT_SIZE;this._bufferedReader=a,this._buffer=null,this._size=b,this._fileStart=null,this._fileEnd=null};Frame.DEFAULT_SIZE=16384,Frame.prototype.toFrameOffset=function(a){return a-this._fileStart},Frame.prototype.isInside=function(a){return this._buffer===null?!1:a>=this._fileStart&&a<=this._fileEnd},Frame.prototype.isLastFrame=function(){return this._buffer===null?!1:this._fileEnd===this._bufferedReader._window._end},Frame.prototype.length=function(){return this._fileEnd-this._fileStart+1},Frame.prototype.read=function(a){this._buffer===null&&(this._buffer=new Buffer(this._size));var b=this;this._bufferedReader._file.open(function(c,d){if(c)return a(c);var e=b._bufferedReader._window._end-b._bufferedReader._globalOffset+1;e>b._size&&(e=b._size),FS.read(d,b._buffer,0,e,b._bufferedReader._globalOffset,function(c,d){if(c)return a(c);b._fileStart=b._bufferedReader._globalOffset,b._fileEnd=b._fileStart+d-1,a(null)})})};var Window=function(a,b,c){if(!c){if(a===undefined||a===null)a=0;if(a<0)throw Error.get(Error.INVALID_WINDOW_START_OFFSET);if(b<0)throw Error.get(Error.INVALID_WINDOW_END_OFFSET);if(a>b&&b!==undefined&&b!==null)throw Error.get(Error.INVALID_WINDOW_RANGE_OFFSET,{ws:a,we:b,fe:undefined})}else if(b>a&&b!==undefined&&b!==null&&a!==undefined&&a!==null)throw Error.get(Error.INVALID_WINDOW_RANGE_OFFSET,{ws:a,we:b,fe:undefined});this._fromEnd=c,this._start=a,this._end=b};Window.prototype.toAbsoluteOffset=function(a){return a===BinaryReader.START_OF_WINDOW?this._start:a===BinaryReader.END_OF_WINDOW?this._end:this._start+a},Window.prototype.isInside=function(a){return a===BinaryReader.START_OF_WINDOW||a===BinaryReader.END_OF_WINDOW?!0:a>=0&&a<=this._end-this._start},Window.prototype.setEnd=function(a){if(this._fromEnd){this._start=this._start!==undefined&&this._start!==null?a-this._start:a,this._end=this._end!==undefined&&this._end!==null?a-this._end:a;if(this._start>this._end)return Error.get(Error.INVALID_WINDOW_RANGE_OFFSET,{ws:this._start,we:this._end,fe:a})}else if(this._end===undefined||this._end===null){if(this._start>a)return Error.get(Error.INVALID_WINDOW_RANGE_OFFSET,{ws:this._start,we:this._end,fe:a});this._end=a}return null};var DataReader=function(a,b){EVENTS.EventEmitter.call(this),b=b||{},b.bufferSize===0&&(b.bufferSize=-1);if(b.bufferSize<1)throw Error.get(Error.INVALID_BUFFER_SIZE);if(b.bufferSize===undefined||b.bufferSize===null)b.bufferSize=Frame.DEFAULT_SIZE;this._settings={encoding:b.encoding||null,bufferSize:b.bufferSize,start:0},this._fileName=a,this._stream=null,this._reading=!1,this._interrupted=!1,this._paused=!1,this._line=null};DataReader.prototype=Object.create(EVENTS.EventEmitter.prototype),DataReader.prototype.constructor=DataReader,DataReader.prototype.interrupt=function(){this._interrupted||(this._paused?(this._paused=!1,this._line=null,this._settings.start=0,this._line=null,this.emit("end")):(this._interrupted=!0,this._reading=!1))},DataReader.prototype.pause=function(){this._paused||(this._paused=!0,this._reading=!1)},DataReader.prototype.read=function(){if(this._reading)return;this._reading=!0;var a=this;FS.stat(this._fileName,function(b,c){if(b)return a.emit("error",b);a._stream=FS.createReadStream(a._fileName,a._settings);var d=c.size,e=a.listeners("byte").length!==0,f=a.listeners("character").length!==0,g=a.listeners("line").length!==0,h=f||g||e,i=function(){return a._settings.start===d?-1:a._settings.start};a._stream.on("error",function(b){a.emit("error",b),a._reading=!1,a._interrupted=!1,a._paused=!1,a._line=null,a._settings.start=0}).on("end",function(){a._line&&a.emit("line",a._line,-1),a._reading=!1,a._interrupted=!1,a._paused=!1,a._line=null,a._settings.start=0,a._line=null,a.emit("end")}).on("data",function(b){var c,e=!1,f,j=0,k=b.length;if(h){for(var l=0;l<k;l++){if(a._interrupted||a._paused)break;c=b[l];if(!a._settings.encoding){a._settings.start++,a.emit("byte",c,i());continue}a._settings.start+=Buffer.byteLength(c,a._settings.encoding),a.emit("character",c,i());if(!g)continue;if(c==="\r"){e=!0;continue}c==="\n"&&(f=b.substring(j,e?l-1:l),j=l+1,a._line&&(f=a._line+f,a._line=null),a.emit("line",f,i())),e=!1}g&&a._settings.encoding&&j!==d&&!a._paused&&!a._interrupted&&(f=j!==0?b.substring(j):b,a._line=a._line?a._line+f:f)}else a._settings.start+=k;if(a._interrupt||a._pause)b=b.slice(0,a._settings.start);a.emit("buffer",b,i()),a._interrupted?(a._interrupted=!1,a._line=null,a._stream.destroy(),a.emit("end")):a._paused&&a._stream.destroy()})})},DataReader.prototype.resume=function(){this._paused&&(this._paused=!1,this.read())};var BinaryReader=function(a,b){b=b||{},b.bufferSize===0&&(b.bufferSize=-1),this._window=new Window(b.start,b.end,b.fromEnd),this._file=new File(a),this._frame=new Frame(this,b.bufferSize),this._initialized=!1,this._globalOffset=null};BinaryReader.START_OF_WINDOW={},BinaryReader.END_OF_WINDOW={},BinaryReader.prototype._init=function(a){if(!this._initialized){var b=this;this._file.readMetadata(function(c){if(c)return a(c);if(b._file.isFile){var c=null;c=b._window.setEnd(b._file.size-1),b._globalOffset=b._window._start,c||(b._initialized=!0),a(c)}else a(Error.get(Error.NO_FILE))})}else a(null)},BinaryReader.prototype.close=function(a){a=a.bind(this),this._file.close(function(b){a(b||null)})},BinaryReader.prototype.getOffset=function(){return this._globalOffset},BinaryReader.prototype.isOffsetOutOfWindow=function(){return this._globalOffset==-1},BinaryReader.prototype.read=function(a,b){b=b.bind(this);if(a<1)return b(Error.get(Error.INVALID_READ_BYTES),null,0);if(this.isOffsetOutOfWindow())return b(null,new Buffer(0),0);var c=this._window._end-this._globalOffset+1;a>c&&(a=c);var d=new Buffer(a),e=this,f=function(){var c=0,f=a,g=e._globalOffset+a-1,h=!1;g>e._frame._fileEnd&&(h=!0,g=e._frame._fileEnd),e._frame._buffer.copy(d,c,e._frame.toFrameOffset(e._globalOffset),e._frame.toFrameOffset(g+1));var i=g-e._globalOffset+1;f-=i,c+=i,h?(e._globalOffset+=i,e._frame.read(function(g){if(g)return b(g,null,null);e._frame._buffer.copy(d,c,0,f),e._globalOffset+=f,e._globalOffset===e._window._end+1&&(e._globalOffset=-1),b(null,d,a)})):(e._globalOffset+=a,e._globalOffset===e._window._end+1&&(e._globalOffset=-1),b(null,d,a))},g=function(c,f){if(e._globalOffset>e._frame._fileEnd){e._frame.read(function(a){if(a)return b(a,null,0);g(c,f)});return}var h=e._frame._fileEnd-e._globalOffset+1;h>c&&(h=c);var i=e._frame.toFrameOffset(e._globalOffset);e._frame._buffer.copy(d,f,i,i+h),e._globalOffset+=h,f+=h,c-=h;if(c===0)return b(null,d,a);g(c,f)},h=function(){a<=e._frame.length()?f():g(a,0)};this._init(function(a){if(a)return b(a);e._frame.isInside(e._globalOffset)?h():e._frame.read(function(a){if(a)return b(a,null,0);h()})})},BinaryReader.prototype.seek=function(a,b){b=b.bind(this);var c=this;this._init(function(d){if(d)return b(d);c._window.isInside(a)?(c._globalOffset=c._window.toAbsoluteOffset(a),b(null)):b(Error.get(Error.INVALID_SEEK_OFFSET,{offset:a,we:c._window._end-c._window._start}))})},BinaryReader.prototype.skip=function(a,b){b=b.bind(this);var c=this;if(a===0||this.isOffsetOutOfWindow())return b(null,0);this._init(function(d){if(d)return b(d,null);var e=c._globalOffset+a;e>c._window._end?(e=c._window._end,a=c._window._end-c._globalOffset):e<c._window._start&&(e=c._window._start,a=c._window._start-c._globalOffset),c._globalOffset=e,b(null,a)})};var Deprecated=function(a,b){DataReader.call(this,a,b),BinaryReader.call(this,a,b),console.log("The BufferedReader function has been deprecated. Use DataReader or BinaryReader.\n")};Deprecated.prototype.interrupt=DataReader.prototype.interrupt,Deprecated.prototype.pause=DataReader.prototype.pause,Deprecated.prototype.read=DataReader.prototype.read,Deprecated.prototype.resume=DataReader.prototype.resume,Deprecated.prototype.close=BinaryReader.prototype.close,Deprecated.prototype.readBytes=BinaryReader.prototype.read,Deprecated.prototype.seek=BinaryReader.prototype.seek,Deprecated.prototype.skip=BinaryReader.prototype.skip,Deprecated.prototype._init=BinaryReader.prototype._init,Deprecated.prototype.isOffsetOutOfWindow=BinaryReader.prototype.isOffsetOutOfWindow,Deprecated.DataReader=DataReader,Deprecated.BinaryReader=BinaryReader,module.exports=Deprecated;