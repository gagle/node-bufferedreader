var DataReader = require ("../lib").DataReader;

console.log ("First line, expected offset: 21");
console.log ("Second line, expected offset: 61\n");

new DataReader ("data_reader_unicode", { encoding: "utf8", bufferSize: 4 })
		.on ("error", function (error){
			console.log (error);
		})
		.on ("character", function (character, byteOffset){
			console.log ("character: " + character + ", offset: " + byteOffset);
		})
		.on ("line", function (line, byteOffset){
			console.log ("\nline: " + line + ", offset: " + byteOffset);
		})
		.read ();