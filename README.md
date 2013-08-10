## UNDER HEAVY DEVELOPMENT

To use the module:

```javascript
var reader = require ("buffered-reader");
var BinaryReader = reader.BinaryReader;
var DataReader = reader.DataReader;
```

All the functions that receive a callback are asynchronous and inside them, `this` points to the `DataReader` or `BinaryReader` instance.

<a name="classes"></a>
### Classes ###
[`DataReader`](#data-reader) - Reads a file from start to end and emits events like `byte`, `character`, `line` and `buffer`.  
[`BinaryReader`](#binary-reader) - Reads a file using a pointer that can be moved.

When you need to read a file you typically read a chunk of bytes called "buffer" to avoid multiple calls to the underlying I/O layer, so instead of reading directly from the disk, you read from the previous filled buffer. Doing this you win performance.

Both classes uses an internal buffer so you don't have to worry about buffers.

***

<a name="data-reader"></a>
# DataReader [↑](#classes) #
## Constructor ##
#### DataReader(fileName, [settings]) ####
Reads a file from start to end. The reading can be paused resumed or interrupdes at any time. The file is closed automatically when the `end` or `error` event is emitted, so as you can see there's no function to close it explicitly.

__Parameters__

* fileName [`String`]. The file path.
* settings [`Object`]. An object in literal notation with the settings:
  * bufferSize [`Number`]. The buffer size in bytes. It must be greater than 0. Default: `16KB`.
  * encoding [`String`]. To treat the data as binary this parameter must not be set. If it's a text file, the value must be `"ascii"`, `"utf8"`, `"ucs2"`, `"base64"` or `"hex"`; `"utf8"` is typically used.

<a name="data-reader-custom-errors"></a>
## Custom errors ##

* `INVALID_BUFFER_SIZE` [`Error`]. `{ errno: <dependent>, code: "INVALID_BUFFER_SIZE", description: "The buffer size must be greater than 0." }`.

<a name="data-reader-events"></a>
## Events ##

* `"error"` - Emitted when an error occurs. The error is passed as a callback parameter.
* `"byte"` - Emitted when a byte is read and the encoding has not been configured. The byte and the next byte offset are passed as a callback parameters.
* `"character"` - Emitted when a character is read and the encoding has been configured. The character and the next byte offset are passed as a callback parameters.
* `"line"` - Emitted when a line is read and the encoding has been configured. The line (EOL not included) and the next byte offset are passed as a callback parameters.
* `"buffer"` - Emitted when all the buffer is read. The buffer and the next byte offset are passed as a callback parameters.
* `"end"` - Emitted when all the file is read or when the reading has been interrupted with [`interrupt()`](#data-reader-interrupt).  

The "next byte offset" means that if we have the characters "hi" and we've read "h", the byte offset of "h" is `x` and the next byte offset is `x + 1`, the byte offset of the next character "i". The next byte offset of the last byte, character, line or buffer is `-1`.

<a name="data-reader-functions"></a>
## Functions ##
[`DataReader#interrupt()`](#data-reader-interrupt) - Interrupts the reading.  
[`DataReader#pause()`](#data-reader-pause) - Pauses the reading.  
[`DataReader#read()`](#data-reader-read) - Starts reading the file from the beginning to the end.  
[`DataReader#resume()`](#data-reader-resume) - Resumes the reading paused by [`pause()`](#data-reader-pause).  

***

<a name="data-reader-interrupt"></a>
#### DataReader#interrupt() [↑](#data-reader-functions) ####
Interrupts the file reading and emits the `end` event. A `buffer` event is also emitted with the buffer content sliced to the current byte offset.

__Example__

```javascript
new BufferedReader ("file", { encoding: "utf8" })
	.on ("error", function (error){
		console.log (error);
	})
	.on ("character", function (character, nextByteOffset){
		if (character === "c"){
			//"d" and "e" are not read
			this.interrupt ();
		}
	})
	.read ();
```

file:
```text
abcde
```

***

<a name="data-reader-pause"></a>
#### DataReader#pause() [↑](#data-reader-functions) ####
Pauses the reading. It can be paused at any time.

__Example__

```javascript
new DataReader ("file", { encoding: "utf8" })
	.on ("error", function (error){
		console.log (error);
	})
	.on ("line", function (line, nextByteOffset){
		if (line === "b"){
			//We wait 3 seconds when we read the line "b"
			this.pause ();
			var me = this;
			setTimeout (function (){
				me.resume ();
			}, 3000);
		}
	})
	.read ();
```

file:
```text
a
b
c
```

***

<a name="data-reader-read"></a>
#### DataReader#read() [↑](#data-reader-functions) ####
Starts reading the file from the beginning to the end.

***

<a name="data-reader-resume"></a>
#### DataReader#resume() [↑](#data-reader-functions) ####
Resumes the reading paused by [`pause()`](#data-reader-pause).

__Example__

See the [`pause()`](#data-reader-pause) example.

***

<a name="binary-reader"></a>
# BinaryReader[↑](#classes) #
## Constructor ##
#### BinaryReader(fileName, [settings]) ####
Reads a file using a pointer that can be moved. You can also configure a working window. The limits of the default window are [0, file size - 1]. The window is used to ease the manipulation of the file. If you need to read a portion of a file and you know its limits it's more easier if a window it's used because you can reference the pointer from its start (0) instead of having to reference it from the start of the file.

For example, you have a file but don't know its size, let's suppose size X, range: [0, X-1]. You need to read the last 40 bytes. You have two possible ways to read them.
* Calculate the size and `seek(X-1-40)`. If you need to seek another position within these 40 bytes you need to reference it from the start of the file taking into account that the file size is variable. If you need to read from byte 10 within these 40 bytes you'll need to do a `seek(X-1-40+10)`. As you can see this can become very messy.  
* Create a window, `{ start: 39, fromEnd: true }` (Note: if `fromEnd` is set to true, the 0 value of the start position is actually the file size minus 1). To read the 10th byte from the last 40 bytes you only need to do a `seek(10)`. `seek(0)` sets the pointer to the start of the window, the byte X-1-40. The file size is computed and all the offsets become relative to the window.

__Parameters__

* fileName [`String`]. The file path.
* settings [`Object`]. An object in literal notation with the settings:
  * bufferSize [`Number`]. The buffer size in bytes. It must be greater than 0. Default: `16KB`.
  * start [`Number`]. The window start offset. If `fromEnd` is not set or is set to `false` the offset is referenced from the beginning of the file. If it's set to true it's referenced from the end. Default: if `fromEnd` is false, `0`, if `fromEnd` is true, file size - 1.
  * end [`Number`]. The window end offset. If `fromEnd` is not set or is set to `false` the offset is referenced from the beginning of the file. If it's set to true it's referenced from the end. Default: file size - 1.
  * fromEnd [`Boolean`]. If is set to true the start and end offsets are referenced from the start of the file. If is set to false they are referenced from the end of the file.

<a name="binary-reader-constants"></a>
## Constants ##
* `BinaryReader.START_OF_WINDOW` [`Object`] - Used to set the offset at the start of the window. It can be used in the `seek()` function.
* `BinaryReader.END_OF_WINDOW` [`Object`] - Used to set the offset at the end of the window. It can be used in the `seek()` function.

<a name="binary-reader-custom-errors"></a>
## Custom errors ##

* `INVALID_BUFFER_SIZE` [`Error`]. `{ errno: <dependent>, code: "INVALID_BUFFER_SIZE", description: "The buffer size must be greater than 0." }`.  
* `INVALID_WINDOW_START_OFFSET` [`Error`]. `{ errno: <dependent>, code: "INVALID_WINDOW_START_OFFSET", description: "The start offset must be greater than or equals to 0." }`.  
* `INVALID_WINDOW_END_OFFSET` [`Error`]. `{ errno: <dependent>, code: "INVALID_WINDOW_END_OFFSET", description: "The end offset must be greater than or equals to 0." }`.  
* `INVALID_WINDOW_RANGE_OFFSET` [`Error`]. `{ errno: <dependent>, code: "INVALID_WINDOW_RANGE_OFFSET", description: "The end offset must be greater than or equals to the start`
`offset and both of them must be inside the file range. Window: [{ws}, {we}], File: [0, {fe}]." }`.  
* `INVALID_SEEK_OFFSET` [`Error`]. `{ errno: <dependent>, code: "INVALID_SEEK_OFFSET", description: "The relative offset must be inside the window range. Relative`
`offset: {offset}, Relative window: [0, {we}]." }`.  
* `NO_FILE` [`Error`]. `{ errno: <dependent>, code: "NO_FILE", description: "The source is not a file." }`.  
* `EMPTY_FILE` [`Error`]. `{ errno: <dependent>, code: "EMPTY_FILE", description: "The file is empty." }`.  
* `INVALID_READ_BYTES` [`Error`]. `{ errno: <dependent>, code: "INVALID_READ_BYTES", description: "The number of bytes to read must be equal or greater than 1." }`.

<a name="binary-reader-functions"></a>
## Functions ##
[`BinaryReader#close(callback)`](#binary-reader-close) - Closes the file.  
[`BinaryReader#getOffset()`](#binary-reader-getOffset) - Returns the current offset.  
[`BinaryReader#isOffsetOutOfWindow()`](#binary-reader-isOffsetOutOfWindow) - Checks whether the offset is beyond the last byte, whether the last byte has been read.  
[`BinaryReader#read(bytes, callback)`](#binary-reader-read) - Reads the given number of bytes.  
[`BinaryReader#seek(offset, callback)`](#binary-reader-seek) - Sets the pointer to the given offset.  
[`BinaryReader#skip(bytes, callback)`](#binary-reader-seek) - Skips the given number of bytes.  

A complete example: [id3v1.1.js](https://github.com/Gagle/Node-BufferedReader/blob/master/examples/binary_reader/id3v1.1.js).

***

<a name="binary-reader-close"></a>
#### BinaryReader#close(callback) [↑](#binary-reader-functions) ####
Closes the file.

__Parameters__

* callback [`Function`]. Callback used to notify the result. It gets one parameter, `(error)`:
  * error [`Error`]. Error or `null`.

***

<a name="binary-reader-getOffset"></a>
#### BinaryReader#getOffset() [↑](#binary-reader-functions) ####
Returns the current offset.

__Return__

[`Number`] The offset referenced from the start of the file where the pointer points. It's the next byte to be read.

***

<a name="binary-reader-isOffsetOutOfWindow"></a>
#### BinaryReader#isOffsetOutOfWindow() [↑](#binary-reader-functions) ####
Checks whether the offset is beyond the last byte, whether the last byte has been read. If the file has a size of X bytes and the offset is at byte X-1 (last byte) and you read 1 or more bytes, the offset will be placed outside the window to indicate that the last byte has been read and it's not possible to perfom a skip or read operation.

__Return__

[`Boolean`] `true` if the offset is outside the window, `false` otherwise.

***

<a name="binary-reader-read"></a>
#### BinaryReader#read(bytes, callback) [↑](#binary-reader-functions) ####
Reads the given number of bytes.

__Parameters__

* bytes [`Number`]. Number of bytes to read.
* callback [`Function`]. Callback used to notify the result. It gets three parameters, `(error, bytes, bytesRead)`:
  * error [`Error`]. Error or `null`.
  * bytes [`Buffer`]. Buffer with the bytes that has been read or `null` if error.
  * bytesRead [`Number`]. The number of bytes that has been read.


***

<a name="binary-reader-seek"></a>
#### BinaryReader#seek(offset, callback) [↑](#binary-reader-functions) ####
Sets the pointer to the given offset. The next read operation will start from this offset.

__Parameters__

* offset [`Number`]. The offset to set the pointer.
* callback [`Function`]. Callback used to notify the result. It gets one parameter, `(error)`:
  * error [`Error`]. Error or `null`.

***

<a name="binary-reader-skip"></a>
#### BinaryReader#skip(bytes, callback) [↑](#binary-reader-functions) ####
Skips the given number of bytes. This basically moves the pointer forwards or backwards (it's possible to skip a negative number of bytes).

__Parameters__

* offset [`Number`]. The offset to set the pointer.
* callback [`Function`]. Callback used to notify the result. It gets two parameters, `(error, bytesSkipped)`:
  * error [`Error`]. Error or `null`.
  * bytesSkipped [`Number`]. The number of bytes skipped.