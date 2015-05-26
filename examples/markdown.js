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

ylog.ln.writeFlag(ylog.markdowns, 'Markdown map').ln();

Object.keys(ylog.markdowns).forEach(function(format) {
  var note = ylog.markdowns[format] === 'italic' ? chalk.gray('(may not work on some system)') : '';
  ylog.md.write('%sword%s', format, format).write(' => ')
    .no.md.write('use "%sword%s" to get %s word %s', format, format, ylog.markdowns[format], note)
});

ylog.ln.ln();

