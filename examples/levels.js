

var ylog = require('../'),
  chalk = require('chalk');

ylog.attributes.pad = 4;

var levels = Object.keys(ylog.levels).sort(function(a, b) {
  return ylog.levels[a].weight - ylog.levels[b].weight;
});

ylog.setLevel(levels[0]);


ylog.ln.title(levels.length + ' LEVELS: ').ln();

levels.forEach(function(level) {

  var append = level === 'silent' ? ' *(nothing)*' : '';

  ylog.log('*ylog.' + level + '("' + level + '") =>*' + append);
  ylog[level](level);
  console.log();
});




