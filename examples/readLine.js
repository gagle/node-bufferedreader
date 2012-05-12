var BufferedReader = require ("../src/buffered-reader");

new BufferedReader ("lorem ipsum", { encoding: "utf8" })
  .on ("error", function (error){
    console.log ("error: " + error);
  })
  .on ("line", function (line, offset, num){
    console.log ("%d / %d line: " + line, num, offset);
    if (line === "Phasellus pulvinar mauris in purus consequat vel congue orci hendrerit."){
      this.interrupt ();
    }
  })
  .read ();