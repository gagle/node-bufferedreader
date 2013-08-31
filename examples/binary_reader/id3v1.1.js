var BinaryReader = require ("../lib").BinaryReader;

/*
	This example reads the ID3v1.1 tags from a mp3 file.
	
	
	
	ID3v1/v1.1 specification
	------------------------
	
	http://www.id3.org/ID3v1

	The TAG is used to describe the MPEG Audio file. It contains information about
	artist, title, album, publishing year and genre. There is some extra space for
	comments. It is exactly 128 bytes long and is located at very end of the audio
	data. You can get it by reading the last 128 bytes of the MPEG audio file.

	AAABBBBB BBBBBBBB BBBBBBBB BBBBBBBB
	BCCCCCCC CCCCCCCC CCCCCCCC CCCCCCCD
	DDDDDDDD DDDDDDDD DDDDDDDD DDDDDEEE
	EFFFFFFF FFFFFFFF FFFFFFFF FFFFFFFG

	Sign	Length		Position	Description
			(bytes)		(bytes)
	A		3			(0-2)		Tag identification. Must contain 'TAG' if tag
									exists and is correct.
	B		30			(3-32)		Title
	C		30			(33-62)		Artist
	D		30			(63-92)		Album
	E		4			(93-96)		Year
	F		30			(97-126)	Comment
	G		1			(127)		Genre

	The specification asks for all fields to be padded with null character
	(ASCII 0).
	
	There is a small change proposed in ID3v1.1 structure. The last byte of the
	Comment field may be used to specify the track number of a song in an album.
	If the track byte is used the previous byte (28 from 0-29) must be a null character (ASCII 0).
	It should contain a null character (ASCII 0) if the information is unknown.
	
	Genre list:

	0  - Blues
	1  - Classic Rock
	2  - Country
	3  - Dance
	...
	137 - Heavy Metal
	...
	
	
	The content of the file is:
	
	Offset	00 01 02 03 04 05 06 07 08 09 0A 0B 0C 0D 0E 0F
	
	0230	.. .. .. .. .. .. .. .. .. .. .. .. .. .. .. ..		<music data>
	0240	54 41 47 42 72 65 61 6B 69 6E 67 20 54 68 65 20		TAGBreaking The 
	0250	4C 61 77 00 00 00 00 00 00 00 00 00 00 00 00 00		Law.............
	0260	00 4A 75 64 61 73 20 50 72 69 65 73 74 00 00 00		.Judas Priest...
	0270	00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 42		...............B
	0280	72 69 74 69 73 68 20 53 74 65 65 6C 00 00 00 00		ritish Steel....
	0290	00 00 00 00 00 00 00 00 00 00 00 00 00 31 39 38		.............198
	02A0	30 47 72 65 61 74 20 73 6F 6E 67 21 00 00 00 00		0Great song!....
	02B0	00 00 00 00 00 00 00 00 00 00 00 00 00 00 33 89		..............3‰
*/

//ID3v1.1 tags
var tags = {
	title: null,
	artist: null,
	album: null,
	year: null,
	comment: null,
	track: null,
	genre: null
};

var genres = {
	"0": "Blues",
	"1": "Classic Rock",
	"2": "Country",
	"3": "Dance",
	"137": "Heavy Metal"
};

var close = function (binaryReader, error){
	if (error) console.log (error);
	
	binaryReader.close (function (error){
		if (error) console.log (error);
	});
};

var printTags = function (){
	console.log ("Title:\t\t" + tags.title);
	console.log ("Artist:\t\t" + tags.artist);
	console.log ("Album:\t\t" + tags.album);
	console.log ("Year:\t\t" + tags.year);
	console.log ("Comment:\t" + tags.comment);
	console.log ("Track:\t\t" + tags.track);
	console.log ("Genre:\t\t" + genres[tags.genre]);
};

//Default buffer if not specified is 16KB. Try changing this value, the result should be the same.
var bufferSize = 16384;

//The window starts from byte 127 starting from the end of the file, in our case the byte at the
//offset 0240, value 54. The end limit is automatically set, it's the file size minus 1, offset
//02BF, value 89
new BinaryReader ("id3v1.1.mp3", { bufferSize: bufferSize, start: 127, fromEnd: true })
	//The text has ASCII encoding so it's safe to read 1 byte per chararacter
	//Check if TAG is present, if so the music file has ID3v1/v1.1 tags
	.read (3, function (error, bytes, bytesRead){
		if (error) return close (this, error);
		
		if (bytes.toString ("ascii") !== "TAG"){
			console.log ("The music file doesn't have ID3v1/v1.1 tags.");
			close (this);
			return;
		}
		
		//Read title
		this.read (30, function (error, bytes, bytesRead){
			if (error) return close (this, error);
			
			tags.title = bytes.toString ("ascii");
			
			//Read artist
			this.read (30, function (error, bytes, bytesRead){
				if (error) return close (this, error);
				
				tags.artist = bytes.toString ("ascii");
				
				//Read album
				this.read (30, function (error, bytes, bytesRead){
					if (error) return close (this, error);
					
					tags.album = bytes.toString ("ascii");
					
					//Read year
					this.read (4, function (error, bytes, bytesRead){
						if (error) return close (this, error);
						
						tags.year = bytes.toString ("ascii");
						
						//Read comment
						this.read (29, function (error, bytes, bytesRead){
							if (error) return close (this, error);
							
							tags.comment = bytes.toString ("ascii");
							var isLastCharNullByte = bytes[28] === 0x00;
							
							//Read track
							this.read (1, function (error, bytes, bytesRead){
								if (error) return close (this, error);
								
								if (isLastCharNullByte){
									tags.track = bytes.toString ("ascii");
								}else{
									tags.comment += bytes.toString ("ascii");
								}
								
								//Read genre
								this.read (1, function (error, bytes, bytesRead){
									if (error) return close (this, error);
									
									tags.genre = bytes[0];
									
									//We should have reached the end of the window/file
									if (this.isOffsetOutOfWindow ()){
										console.log ("All tags has been read successfully!\n");
										printTags ();
									}
									
									close (this);
								});
							});
						});
					});
				});
			});
		});
	});