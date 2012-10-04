var BinaryReader = require ("../../build/buffered-reader").BinaryReader;

var file = "binary_reader_file";

var close = function (binaryReader, error, cb){
	if (error) console.log (error);
	
	binaryReader.close (function (error){
		if (error) console.log (error);
		if (cb) cb ();
	});
};

//bytes <= buffer (no extra reads)
var test1 = function (cb){
	console.log ("===== TEST 1 =====");
	
	var window = {
		start: 13, //13 from end, 2 from beginning
		end: 7 //7 from end, 8 from beginning
	};

	console.log ("window: [" + window.start + ", " + window.end + "]");

	var br = new BinaryReader (file, { bufferSize: 4, start: window.start, end: window.end, fromEnd: true });
	console.log ("offset: " + br.getOffset ());
	
	/*
		Buffer (4):				b2.b3.b4.b5
		Offset:					b2
		Bytes to read (2):		b2.b3
		
		Bytes read (2): b2.b3
	*/
	console.log ("\nREAD");
	br.read (2, function (error, bytes, bytesRead){
		if (error) return close (this, error);
		
		console.log (bytes);
		console.log ("bytes read: " + bytesRead);
		console.log ("offset: " + this.getOffset ());
		
		close (this, null, cb);
	});
};

//bytes <= buffer (1 extra read) - Case 1
var test2 = function (cb){
	console.log ("\n\n===== TEST 2 =====");
	
		var window = {
		start: 2,
		end: 8
	};

	console.log ("window: [" + window.start + ", " + window.end + "]");
	
	var br = new BinaryReader (file, { bufferSize: 4, start: window.start, end: window.end });
	console.log ("offset: " + br.getOffset ());
	
	/*
		Buffer (4):				b2.b3.b4.b5
		Offset:					b2
		Bytes to read (2):		b2.b3
		
		Bytes read (2): b2.b3
	*/
	console.log ("\nREAD");
	br.read (2, function (error, bytes, bytesRead){
		if (error) return close (this, error);
		
		console.log (bytes);
		console.log ("bytes read: " + bytesRead);
		console.log ("offset: " + this.getOffset ());
		
		/*
			1 extra read needed here
		
			Buffer (4):				b2.b3.b4.b5 (same as before)
			Offset:					b4 (b2 + 2 bytes from before = b4)
			Bytes to read (4):		b4.b5
			
			Extra read, we need to read 2 more bytes
			
			Buffer (4):				b6.b7.b8 (only 3 bytes are read because the window's end limit is at byte b8)
			Offset:					b6 (b4 + 2 bytes from before the extra read = b6)
			Bytes to read (4):		b6.b7
			
			Bytes read (4): b4.b5.b6.b7
		*/
		console.log ("\nREAD");
		this.read (4, function (error, bytes, bytesRead){
			if (error) return close (this, error);
			
			console.log (bytes);
			console.log ("bytes read: " + bytesRead);
			console.log ("offset: " + this.getOffset ());
			
			close (this, null, cb);
		});
	});
};

//bytes <= buffer (1 extra read) - Case 2
var test3 = function (cb){
	console.log ("\n\n===== TEST 3 =====");
	
	var window = {
		start: 2,
		end: 6
	};

	console.log ("window: [" + window.start + ", " + window.end + "]");
	
	var br = new BinaryReader (file, { bufferSize: 4, start: window.start, end: window.end });
	console.log ("offset: " + br.getOffset ());
	
	/*
		Buffer (4):				b2.b3.b4.b5
		Offset:					b2
		Bytes to read (2):		b2.b3
		
		Bytes read (2): b2.b3
	*/
	console.log ("\nREAD");
	br.read (2, function (error, bytes, bytesRead){
		if (error) return close (this, error);
		
		console.log (bytes);
		console.log ("bytes read: " + bytesRead);
		console.log ("offset: " + this.getOffset ());
		
		/*
			1 extra read needed here
		
			Buffer (4):				b2.b3.b4.b5 (same as before)
			Offset:					b4 (b2 + 2 bytes from before = b4)
			Bytes to read (4):		b4.b5
			
			Extra read, we need to read 2 more bytes
			
			Buffer (4):				b6 (only 1 byte is read because the window's end limit is at byte b6)
			Offset:					b6 (b4 + 2 bytes from before the extra read = b6)
			Bytes to read (4):		b6 (only 1 byte is copied because the window's end limit is at byte b6)
			
			Bytes read (3): b4.b5.b6
		*/
		console.log ("\nREAD");
		this.read (4, function (error, bytes, bytesRead){
			if (error) return close (this, error);
			
			console.log (bytes);
			console.log ("bytes read: " + bytesRead);
			console.log ("offset: " + this.getOffset ());
			
			close (this, null, cb);
		});
	});
};

//bytes > buffer
var test4 = function (){
	console.log ("\n\n===== TEST 4 =====");
	
	var window = {
		start: 2,
		end: 11
	};

	console.log ("window: [" + window.start + ", " + window.end + "]");
	
	var br = new BinaryReader (file, { bufferSize: 3, start: window.start, end: window.end });
	console.log ("offset: " + br.getOffset ());
	
	/*
		Buffer (3):				b2.b3.b4
		Offset:					b2
		Bytes to read (1):		b2
		
		Bytes read (1): b2
	*/
	console.log ("\nREAD");
	br.read (1, function (error, bytes, bytesRead){
		if (error) return close (this, error);
		
		console.log (bytes);
		console.log ("bytes read: " + bytesRead);
		console.log ("offset: " + this.getOffset ());
		
		/*
			10 bytes wants to be read
			3 extra reads are done
			
			Buffer (3):				b2.b3.b4 (same as before)
			Offset:					b3 (b2 + 1 bytes from before = b3)
			Bytes to read (10):		b3.b4
			
			Extra read
			
			Buffer (3):				b5.b6.b7
			Offset:					b5 (b3 + 2 bytes from before = b5)
			Bytes to read (10):		b5.b6.b7
			
			Extra read
			
			Buffer (3):				b8.b9.b10
			Offset:					b8 (b5 + 3 bytes from before = b8)
			Bytes to read (10):		b8.b9.b10
			
			Extra read
			
			Buffer (3):				b11 (only 1 byte is read because the window's end limit is at byte b11)
			Offset:					b11 (b8 + 3 bytes from before = b11)
			Bytes to read (10):		b11 (only 1 byte is copied because the window's end limit is at byte b11)
			
			Bytes read (9): b3.b4.b5.b6.b7.b8.b9.b10.b11
		*/
		console.log ("\nREAD");
		br.read (10, function (error, bytes, bytesRead){
			if (error) return close (this, error);
			
			console.log (bytes);
			console.log ("bytes read: " + bytesRead);
			console.log ("offset: " + this.getOffset ());
			
			close (this);
		});
	});
};

test1 (function (){
	test2 (function (){
		test3 (function (){
			test4 ();
		});
	});
});