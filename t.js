var reader = require ("./lib");
var hex = require ("hex");

/*
var br = reader.open (__filename);

br.on ("error", function (error){
	console.error (error);
})
.on ("close", function (){
	console.log ("closed");
})
.read (10, function (bytesRead, buffer){
	console.log (bytesRead, buffer.toString ());
})
.seek (-1, { current: true }, function (){
	console.log ("p: " + br.tell ());
})
.read (20, function (bytesRead, buffer){
	console.log (bytesRead, buffer.toString ());
})
.close ();
*/

/*
var br = reader.open ("s");

br.on ("error", function (error){
	console.error (error);
})
.on ("close", function (){
	console.log ("closed");
})
.seek (21, function (){
	console.log ("p: " + br.tell ());
})
.read (5, function (bytesRead, buffer){
	console.log (bytesRead, buffer);
})
*/


var br = reader.open ("test/file", { highWaterMark: 3 });

br.on ("error", function (error){
	console.error (error);
})
.on ("close", function (){
	console.log ("closed");
})
.read (5, function (bytesRead, buffer){
	console.log (bytesRead, buffer);
})
