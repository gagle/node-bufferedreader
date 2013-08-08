"use strict";

var ASSERT = require ("assert");
var FS = require ("fs");
var dr = require ("../../lib/buffered-reader").DataReader;

var WIN = process.platform === "win32";
var DATA_READER = "data-reader/";

describe ("data-reader", function (){
	describe ("open", function (){
		it ("should throw an INVALID_BUFFER_SIZE exception if the buffer size is " +
			"not positive", function (done){
				ASSERT.throws (function (){
					dr.open ("file", { bufferSize: -1 });
				}, function (error){
					return error.code === "INVALID_BUFFER_SIZE";
				});
				done ();
			});
	});
	
	describe ("read", function (){
		it ("should emit a BINARY_DATA error when a character or line listeners " +
				"are added and the file is read as a binary data", function (done){
					dr.open ("file")
							.on ("error", function (error){
								ASSERT.ok (error.code === "BINARY_DATA");
								
								dr.open ("file")
										.on ("error", function (error){
											ASSERT.ok (error.code === "BINARY_DATA");
											done ();
										})
										.on ("line", function (){})
										.on ("end", function (){
											ASSERT.fail ();
										})
										.read ();
							})
							.on ("character", function (){})
							.on ("end", function (){
								ASSERT.fail ();
							})
							.read ();
				});
		
		it ("should not emit any buffer event if the file size is 0",
				function (done){
					FS.writeFile (DATA_READER + "file", "", "utf8", function (error){
						if (error) return done (error);
						var exe = false;
						dr.open (DATA_READER + "file")
								.on ("buffer", function (buffer){
									exe = true;
								})
								.on ("end", function (){
									ASSERT.ok (!exe);
									done ();
								})
								.read ();
					});
		});
		
		it ("should emit buffer events", function (done){
			FS.writeFile (DATA_READER + "file", "abc", "utf8", function (error){
				if (error) return done (error);
				var n = 0;
				dr.open (DATA_READER + "file", { bufferSize: 1 })
						.on ("buffer", function (buffer){
							n++;
						})
						.on ("end", function (){
							ASSERT.equal (n, 3);
							done ();
						})
						.read ();
			});
		});
		
		it ("should emit byte events", function (done){
			FS.writeFile (DATA_READER + "file", "↑", "utf8", function (error){
				if (error) return done (error);
				var n = 0;
				dr.open (DATA_READER + "file")
						.on ("byte", function (b){
							n++;
						})
						.on ("end", function (){
							ASSERT.equal (n, 3);
							done ();
						})
						.read ();
			});
		});
		
		it ("should emit character events", function (done){
			FS.writeFile (DATA_READER + "file", "↑", "utf8", function (error){
				if (error) return done (error);
				var n = 0;
				dr.open (DATA_READER + "file", { encoding: "utf8" })
						.on ("character", function (c){
							n++;
						})
						.on ("end", function (){
							ASSERT.equal (n, 1);
							done ();
						})
						.read ();
			});
		});
		
		it ("should emit line events, empty lines, big buffer", function (done){
			FS.writeFile (DATA_READER + "file", "\n\n\n", "utf8", function (error){
				if (error) return done (error);
				var n = 0;
				dr.open (DATA_READER + "file", { encoding: "utf8" })
						.on ("line", function (line){
							n++;
							ASSERT.equal (line, "");
						})
						.on ("end", function (){
							ASSERT.equal (n, 3);
							done ();
						})
						.read ();
			});
		});
		
		it ("should emit line events, not empty lines, big buffer", function (done){
			FS.writeFile (DATA_READER + "file", "1\n2\n3\n", "utf8", function (error){
				if (error) return done (error);
				var n = 0;
				dr.open (DATA_READER + "file", { encoding: "utf8" })
						.on ("line", function (line){
							n++;
							ASSERT.equal (line, n.toString ());
						})
						.on ("end", function (){
							ASSERT.equal (n, 3);
							done ();
						})
						.read ();
			});
		});
		
		it ("should emit line events, no last \\n, big buffer", function (done){
			FS.writeFile (DATA_READER + "file", "1\n2\n3", "utf8", function (error){
				if (error) return done (error);
				var n = 0;
				dr.open (DATA_READER + "file", { encoding: "utf8" })
						.on ("line", function (line){
							n++;
							ASSERT.equal (line, n.toString ());
						})
						.on ("end", function (){
							ASSERT.equal (n, 3);
							done ();
						})
						.read ();
			});
		});
		
		it ("should emit line events, no \\n, big buffer", function (done){
			FS.writeFile (DATA_READER + "file", "abc", "utf8", function (error){
				if (error) return done (error);
				var n = 0;
				dr.open (DATA_READER + "file", { encoding: "utf8" })
						.on ("line", function (line){
							n++;
							ASSERT.equal (line, "abc");
						})
						.on ("end", function (){
							ASSERT.equal (n, 1);
							done ();
						})
						.read ();
			});
		});
		
		it ("should emit line events, empty lines, little buffer", function (done){
			FS.writeFile (DATA_READER + "file", "\n\n\n", "utf8", function (error){
				if (error) return done (error);
				var n = 0;
				dr.open (DATA_READER + "file", { encoding: "utf8", bufferSize: 1 })
						.on ("line", function (line){
							n++;
							ASSERT.equal (line, "");
						})
						.on ("end", function (){
							ASSERT.equal (n, 3);
							done ();
						})
						.read ();
			});
		});
		
		it ("should emit line events, not empty lines, little buffer",
				function (done){
					FS.writeFile (DATA_READER + "file", "1\n2\n3\n", "utf8",
							function (error){
								if (error) return done (error);
								var n = 0;
								dr.open (DATA_READER + "file", { encoding: "utf8",
										bufferSize: 1 })
										.on ("line", function (line){
											n++;
											ASSERT.equal (line, n.toString ());
										})
										.on ("end", function (){
											ASSERT.equal (n, 3);
											done ();
										})
										.read ();
							});
		});
		
		it ("should emit line events, no last \\n, little buffer", function (done){
			FS.writeFile (DATA_READER + "file", "1\n2\n3", "utf8", function (error){
				if (error) return done (error);
				var n = 0;
				dr.open (DATA_READER + "file", { encoding: "utf8", bufferSize: 1 })
						.on ("line", function (line){
							n++;
							ASSERT.equal (line, n.toString ());
						})
						.on ("end", function (){
							ASSERT.equal (n, 3);
							done ();
						})
						.read ();
			});
		});
		
		it ("should emit line events, no \\n, little buffer", function (done){
			FS.writeFile (DATA_READER + "file", "abc", "utf8", function (error){
				if (error) return done (error);
				var n = 0;
				dr.open (DATA_READER + "file", { encoding: "utf8", bufferSize: 1 })
						.on ("line", function (line){
							n++;
							ASSERT.equal (line, "abc");
						})
						.on ("end", function (){
							ASSERT.equal (n, 1);
							done ();
						})
						.read ();
			});
		});
		
		afterEach (function (done){
			FS.exists (DATA_READER + "file", function (exists){
				if (exists){
					FS.unlink (DATA_READER + "file", done);
				}else{
					done ();
				}
			});
		});
	});
	
	describe ("pause/resume", function (){
		it ("should pause at the end of the file, just before the end event is " +
				"emitted, and when resume is called the end event is emitted",
				function (done){
					FS.writeFile (DATA_READER + "file", "abc", "utf8", function (error){
						if (error) return done (error);
						var n = 0;
						var paused = false;
						dr.open (DATA_READER + "file", { bufferSize: 1 })
								.on ("buffer", function (buffer){
									n++;
									if (n === 3){
										this.pause ();
										paused = true;
										var me = this;
										setTimeout (function (){
											me.resume ();
										}, 1);
									}
								})
								.on ("end", function (){
									ASSERT.equal (n, 3);
									ASSERT.ok (paused);
									done ();
								})
								.read ();
					});
				});
		
		it ("the internal buffer must be null when the reader is paused after a" +
				"buffer event", function (done){
					FS.writeFile (DATA_READER + "file", "abc", "utf8", function (error){
						if (error) return done (error);
						dr.open (DATA_READER + "file", { bufferSize: 1 })
								.on ("buffer", function (buffer){
									ASSERT.ok (this._buffer === null);
								})
								.on ("end", function (){
									done ();
								})
								.read ();
					});
				});
	
		it ("should pause and resume buffer events", function (done){
			FS.writeFile (DATA_READER + "file", "abc", "utf8", function (error){
				if (error) return done (error);
				var n = 0;
				dr.open (DATA_READER + "file", { bufferSize: 1 })
						.on ("buffer", function (buffer){
							n++;
							if (n === 2){
								this.pause ();
								var me = this;
								setTimeout (function (){
									me.resume ();
								}, 1);
							}
						})
						.on ("end", function (){
							ASSERT.equal (n, 3);
							done ();
						})
						.read ();
			});
		});
		
		it ("should pause and resume byte events", function (done){
			FS.writeFile (DATA_READER + "file", "↑", "utf8", function (error){
				if (error) return done (error);
				var n = 0;
				var paused = false;
				var nextByte;
				dr.open (DATA_READER + "file")
						.on ("byte", function (b, next){
							n++;
							if (n === 2){
								this.pause ();
								var me = this;
								setTimeout (function (){
									ASSERT.ok (me._buffer !== null);
									ASSERT.ok (me._start === 2);
									me.resume ();
								}, 1);
							}else if (n === 3){
								ASSERT.equal (b, 0x91);
							}
							nextByte = next;
						})
						.on ("end", function (){
							ASSERT.equal (n, 3);
							ASSERT.equal (nextByte, -1);
							done ();
						})
						.read ();
			});
		});
		
		it ("should pause and resume line events, middle line and before end",
				function (done){
					FS.writeFile (DATA_READER + "file", "abc", "utf8", function (error){
						if (error) return done (error);
						var n = 0;
						var paused = false;
						var linePause = false;
						dr.open (DATA_READER + "file", { encoding: "utf8" })
								.on ("character", function (c){
									if (c === "b"){
										this.pause ();
										paused = true;
										var me = this;
										setTimeout (function (){
											me.resume ();
										}, 1);
									}
								})
								.on ("line", function (buffer){
									ASSERT.ok (paused);
									this.pause ();
									linePause = true;
									var me = this;
									setTimeout (function (){
										me.resume ();
									}, 1);
								})
								.on ("end", function (){
									ASSERT.ok (linePause);
									done ();
								})
								.read ();
					});
		});
		
		afterEach (function (done){
			FS.exists (DATA_READER + "file", function (exists){
				if (exists){
					FS.unlink (DATA_READER + "file", done);
				}else{
					done ();
				}
			});
		});
	});
	
	describe ("stop", function (){
		it ("should stop anything", function (done){
			FS.writeFile (DATA_READER + "file", "↑", "utf8", function (error){
				if (error) return done (error);
				var n = 0;
				var paused = false;
				dr.open (DATA_READER + "file")
						.on ("byte", function (b){
							n++;
							if (n === 2){
								this.stop ();
							}
						})
						.on ("end", function (){
							ASSERT.equal (n, 2);
							done ();
						})
						.read ();
			});
		});
		
		afterEach (function (done){
			FS.exists (DATA_READER + "file", function (exists){
				if (exists){
					FS.unlink (DATA_READER + "file", done);
				}else{
					done ();
				}
			});
		});
	});
});