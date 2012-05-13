var BufferedReader = require ("../src/buffered-reader");

new BufferedReader ("a", { encoding: "utf8" })
	.on ("error", function (error){
		console.log (error);
	})
	.on ("character", function (c, byteOffset){
		console.log ("char: >" + c.charCodeAt(0) + "< " + byteOffset);
	})
	.on ("line", function (line, byteOffset){
		console.log ("line: >" + line + "< " + byteOffset);
	})
	.on ("buffer", function (buffer, byteOffset){
		console.log ("buffer: >" + buffer + "< " + byteOffset);
	})
	.read ();

//console.log (Buffer.byteLength ("a", "utf8"));	//bytes: 1, UNICODE hex: 0x61 (1), REAL hex: 0x61 (1)
//console.log (Buffer.byteLength ("¡", "utf8"));	//bytes: 2, UNICODE hex: 0xA1 (1), REAL hex: 0xC2A1 (2)
//console.log (Buffer.byteLength ("↑", "utf8"));	//bytes: 3, UNICODE hex: 0x2191 (2), REAL hex: 0xE28691 (3)
//console.log (Buffer.byteLength ("𤁥", "utf8"));	//bytes: 3, UNICODE hex: 0x24065 (3), REAL hex: 0xF0A481A5 (4)