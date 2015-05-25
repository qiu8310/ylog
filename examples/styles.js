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

var styles = ylog.styles;
var keys = Object.keys(styles);

ylog.ln.ln.writeFlag(keys, keys.length + ' styles').ln();


var map = {
  writeFlag: [{a: true, b: 'foo'}],
  align: ['align', 10, 'right', '-']
};

keys.forEach(function(key) {
  var args;
  if (key in map) {
    args = map[key];
    ylog.log('*ylog.%s(%s)*', key, args.map(function(v) {return JSON.stringify(v);}).join(', '));
    switch (args.length) {
      case 1:
        ylog[key](args[0]).ln();
        break;
      case 2:
        ylog[key](args[0], args[1]).ln();
        break;
      case 3:
        ylog[key](args[0], args[1], args[2]).ln();
        break;
      case 4:
        ylog[key](args[0], args[1], args[2], args[3]).ln();
        break;
    }
  } else {
    ylog.log('*ylog.%s(%j)*', key, key);
    ylog[key](key).ln();
  }




});


ylog.ln();

