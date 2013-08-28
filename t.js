var reader = require ("./lib");

var br = reader.create (__filename);

br.on ("error", function (error){
	console.error (error);
})
.on ("close", function (){
	console.log ("closed");
})
.read (10, function (bytesRead, buffer){
	console.log (bytesRead, buffer.toString());
})
.seek (-1, { current: true }, function (){
	console.log ("p: " + br.tell ());
})
.read (20, function (bytesRead, buffer){
	console.log (bytesRead, buffer.toString());
})
.close ();