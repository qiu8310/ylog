
var ylog = require('..');
var fs = require('fs');


var p = ylog.progress('progress', {theme: 'ascii'});

var basicJob = p.addJob('job 1', 1000, 2);


basicJob.complete(10);


//basicJob progress
var sid = setInterval(function() {
  basicJob.complete(100);
}, 500);


// streamJob progress
fs.stat(__filename, function(err, stats) {
  if (err) {
    throw err;
  }

  var streamJob = p.addJob('job 2', stats.size, true);

  setTimeout(function() {
    fs.createReadStream(__filename).pipe(streamJob).on('data', function() {
      //
    });
  }, 200)

});


p.on('finished', function(name) {
  p.hide();
  console.log('finished ' + name);
  clearInterval(sid);
});


