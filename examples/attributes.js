/*
 * ylog
 * https://github.com/qiu8310/ylog
 *
 * Copyright (c) 2015 Zhonglei Qiu
 * Licensed under the MIT license.
 */


var ylog = require('../'),
  chalk = require('chalk');

ylog.attributes.pad = 4;

var attributes = ylog.attributes;

ylog.ln.ln.title('Attributes: ').ln.ln.wrap(60).log(attributes).ln();


var desc = {
  md: 'enable markdown',
  pad: 'length of `padChar` before each line',
  padChar: 'specify the character for `pad`',
  nsPad: 'length of `nsPadChar` before the namespace tag',
  nsPadChar: 'specify the character for `nsPad`',
  color: 'set the output text\'s color',
  tag: 'show or hide the left side namespace and level information',
  label: 'print a custom label just like namespace or level',
  prefix: 'prefix the tag to each line break, otherwise it will ' +
  'just prefix an empty spaces who\'s length equal to the tag',
  wrap: 'wrap the output text'
};

for (var key in desc) {
  var c = ylog.label(chalk.white.bold(key + ': '), 11, 'right').color('cyan').wrap(70).log(desc[key]);
}

ylog.ln();
