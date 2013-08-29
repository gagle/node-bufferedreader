"use strict";

var assert = require ("assert");
var fs = require ("fs");
var hex = require ("hex");
var br = require ("../../lib");

/*
	Reads the ID3v1/v1.1 tags from an mp3 file.
	
	
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

	Sign   Length   Position   Description
	A      3        (0-2)      Tag identification. Must contain 'TAG' if tag
	                             exists and is correct.
	B      30       (3-32)     Title
	C      30       (33-62)    Artist
	D      30       (63-92)    Album
	E      4        (93-96)    Year
	F      30       (97-126)   Comment
	G      1        (127)      Genre

	The specification asks for all fields to be padded with null character
	(ASCII 0).
	
	There is a small change proposed in ID3v1.1 structure. The last byte of the
	Comment field may be used to specify the track number of a song in an album.
	If the track byte is used the previous byte (28 from 0-29) must be a null
	character (ASCII 0). It should contain a null character (ASCII 0) if the
	information is unknown.
	
	Genre list:
	0 Blues
	1 Classic Rock
	2 Country
	3 Dance
	...
	137 Heavy Metal
	...
*/

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

var file = "id3-v1.1.mp3";

/*
	The content of the file is:
	
	Offset   00 01 02 03 04 05 06 07 08 09 0A 0B 0C 0D 0E 0F
	...
	000030   .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. ..   <music_data>
	000040   54 41 47 42 72 65 61 6B 69 6E 67 20 54 68 65 20   TAGBreaking The
	000050   4C 61 77 00 00 00 00 00 00 00 00 00 00 00 00 00   Law.............
	000060   00 4A 75 64 61 73 20 50 72 69 65 73 74 00 00 00   .Judas Priest...
	000070   00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 42   ...............B
	000080   72 69 74 69 73 68 20 53 74 65 65 6C 00 00 00 00   ritish Steel....
	000090   00 00 00 00 00 00 00 00 00 00 00 00 00 31 39 38   .............198
	0000A0   30 47 72 65 61 74 20 73 6F 6E 67 21 00 00 00 00   0Great song!....
	0000B0   00 00 00 00 00 00 00 00 00 00 00 00 00 00 33 89   ..............3.
*/
hex (fs.readFileSync (file));
console.log ();

var r = br.open (file);

r.on ("error", function (error){
	console.error (error);
})
.on ("close", function (){
	console.log ("Title:    " + tags.title + "\n" +
			"Artist:   " + tags.artist + "\n" +
			"Album:    " + tags.album + "\n" +
			"Year:     " + tags.year + "\n" +
			"Comment:  " + tags.comment + "\n" +
			"Track:    " + tags.track + "\n" +
			"Genre:    " + tags.genre);
})

//ID3v1/v1.1 text data is ascii-encoded so it's safe to read 1 byte per
//chararacter
//ID3v1/v1.1 tags are found in the last 128 bytes
.seek (127, { end: true })

//Check if TAG is present, if so, the music file has ID3v1/v1.1 tags
.read (3, function (bytesRead, buffer){
	if (buffer.toString () !== "TAG"){
		//The file doesn't have ID3v1/v1.1 tags
		console.log ("The file doesn't have ID3v1/v1.1 tags");
		r.close ();
	}else{
		var isLastCharNullByte;
		
		//Title
		r.read (30, function (bytesRead, buffer){
			tags.title = buffer.toString ();
		})
		//Artist
		.read (30, function (bytesRead, buffer){
			tags.artist = buffer.toString ();
		})
		//Album
		.read (30, function (bytesRead, buffer){
			tags.album = buffer.toString ();
		})
		//Year
		.read (4, function (bytesRead, buffer){
			tags.year = buffer.toString ();
		})
		//Comment
		.read (29, function (bytesRead, buffer){
			tags.comment = buffer.toString ();
			isLastCharNullByte = buffer[28] === 0;
		})
		//Track
		.read (1, function (bytesRead, buffer){
			if (isLastCharNullByte){
				tags.track = buffer.toString ();
			}else{
				tags.comment += buffer.toString ();
			}
		})
		//Genre
		.read (1, function (bytesRead, buffer){
			tags.genre = genres[buffer[0]];
			
			//We should have reached the end of the file
			assert.ok (r.isEOF ());
		})
		.close ();
	}
});