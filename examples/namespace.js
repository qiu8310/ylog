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


function getDoc(fn) {
  return (fn.toString().replace(/^function[\s\S]*?\{.*|\}[\s\S]*$/g, ''));
}


ylog.ln.ln();
function ns() {
  var ns1 = ylog('ns_1');
  var ns2 = ylog('ns_2');
  var ns3 = ylog('ns_3');
  var ns4 = ylog('ns_4');

  ns1.ok('ok');
  ns2.write('error');
  ns3.error('info');
  ns4.title('title');
}
var src = getDoc(ns);

ylog.write('Your &examples/namespace.js& file:');

ylog.color('gray').write(src);

ylog.write('Using &YLOG="ns*,-ns_3" node examples/namespace.js& to get the output:').ln.ln();
ns();
ylog.ln.ln();


function magic() {
  ylog.title('watch the magic:');
  ylog.ln.subtitle('use %s like grammar:', 'markdown'); // "ln" means output an empty line
  ylog.log('the !word! will become yellow');
  ylog.no.md.log('but this !word! will not').ln(); // "no.md" means no markdown
}
ylog.write('&src:&').ln();
src = getDoc(magic);
console.log(ylog.chalk.gray(src));
ylog.write('&output:&').ln();
magic();
ylog.ln.ln();




