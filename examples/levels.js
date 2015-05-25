

var ylog = require('../'),
  chalk = require('chalk');

var levels = Object.keys(ylog.levels).sort(function(a, b) {
  return ylog.levels[a].weight - ylog.levels[b].weight;
});

ylog.setLevel(levels[0]);


ylog.title.ln('\n' + levels.length + ' LEVELS: ');

levels.forEach(function(level) {

  var append = level === 'silent' ? ' *(nothing)*' : '';

  ylog.log('*ylog.' + level + '("' + level + '") =>*' + append);
  ylog[level](level);
  console.log();
});


// show levels that larger than debug


// only show debug level and error level



