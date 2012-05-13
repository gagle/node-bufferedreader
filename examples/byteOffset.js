var BufferedReader = require ("../build/buffered-reader");

console.log ("First line, expected offset: 21");
console.log ("Second line, expected offset: 61\n");

new BufferedReader ("bmp", { encoding: "utf8", bufferSize: 4 })
	.on ("error", function (error){
		console.log (error);
	})
	.on ("character", function (character, byteOffset){
		console.log ("character: " + character + ", offset: " + byteOffset);
	})
	.on ("line", function (line, byteOffset){
		console.log ("\nline: " + line + ", offset: " + byteOffset);
	})
	.on ("buffer", function (buffer, byteOffset){
		console.log ("buffer: " + buffer + ", offset: " + byteOffset);
	})
	.on ("end", function (){
		console.log ("EOF");
	})
	.read ();