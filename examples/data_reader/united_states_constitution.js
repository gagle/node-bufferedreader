var DataReader = require ("../../build/buffered-reader").DataReader;

var file = "united_states_constitution";

var data = {
	words: 0,
	lines: 0,
	article: 0,
	section: 0,
	constitution: 0,
	president: 0
};

var word = {
	ARTICLE: { re: new RegExp ("article", "g"), data: "article" },
	SECTION: { re: new RegExp ("section", "g"), data: "section" },
	CONSTITUTION: { re: new RegExp ("constitution", "g"), data: "constitution" },
	PRESIDENT: { re: new RegExp ("president", "g"), data: "president" },
};

var printData = function (){
	console.log ("words:\t\t\t" + data.words);
	console.log ("lines:\t\t\t" + data.lines);
	console.log ("articles:\t\t" + data.article);
	console.log ("sections:\t\t" + data.section);
	console.log ("\"constitution\" word #:\t" + data.constitution);
	console.log ("\"president\" word #:\t" + data.president);
};

var count = function (line, re){
	var count = line.match (re.re);
	if (count) data[re.data] += count.length;
};

var reWord = /\s+/g;
var countWords = function (line){
	if (line !== ""){
		data.words += line.split (reWord).length;
	}
};

new DataReader (file, { encoding: "utf8" })
		.on ("error", function (error){
			console.log (error);
		})
		.on ("line", function (line, nextByteOffset){
			data.lines++;
			
			line = line.trim ().toLowerCase ();
			count (line, word.ARTICLE);
			count (line, word.SECTION);
			count (line, word.CONSTITUTION);
			count (line, word.PRESIDENT);
			
			countWords (line);
			
			//If we found the word "Washington" we wait for 3 seconds
			if (line.indexOf ("washington") !== -1){
				this.pause ();
				console.log ("Washington found. Waiting 3 seconds.\n");
				var me = this;
				setTimeout (function (){
					me.resume ();
				}, 3000);
			}
		})
		.on ("end", function (){
			printData ();
		})
		.read ();