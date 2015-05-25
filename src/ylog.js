/*
 * ylog
 * https://github.com/qiu8310/ylog
 *
 * Copyright (c) 2015 Zhonglei Qiu
 * Licensed under the MIT license.
 */

var os = require('os');

var c = require('./core'),
  h = require('./helper'),
  chalk = c.chalk;


//****************  添加自定义的库  **************//

//console.log(chalk.blue('ℹ'));
//console.log(chalk.red('✗ ✘ ☒'));
//console.log(chalk.green('✓ ✔ ☑'));
//console.log(chalk.green(':u7121:'));
//console.log(chalk.yellow.bold('! ︕ ﹗ ！⚠  '));


/********* 定义 levels *********/
c.levelFlag('silly',   -Infinity, chalk.bold.gray('[S]'));
c.levelFlag('verbose', 1000, chalk.bold.blue('[V]'));
c.levelFlag('debug',   2000, chalk.bold.magenta('[D]'));
c.levelFlag('info',    3000, chalk.bold.cyan('ℹ'));
c.levelFlag('warn',    4000, chalk.bold.yellow('!'));
c.levelFlag('ok',      5000, chalk.bold.green('✓'));
c.levelFlag('error',   6000, chalk.bold.red('✗'));
c.levelFlag('fatal',   7000, chalk.bold.red('✗✗✗'));
c.levelFlag('silent',  Infinity, ' ');


// 设置默认的属性
c.setLevel('info');
c.setLevelMode('weight');


/********* 定义 styles *********/
// @TODO str 可能带有样式！
function upFirst (str) { return str ? str[0].toUpperCase() + str.substr(1) : ''; }
function format (args) { return c.format.apply(c, args); }
c.styleFlag('title', function() {
  return chalk.underline(upFirst(format(arguments)));
});
c.styleFlag('subtitle', function() {
  return chalk.white.bold(upFirst(format(arguments)));
});

c.styleFlag('ln', function() { return os.EOL + format(arguments); });
c.styleFlag('log', function() { return format(arguments); });
c.styleFlag('write', function() { return format(arguments); });
c.styleFlag('writeOk', function() { return chalk.green('>> ') + format(arguments); });
c.styleFlag('writeError', function() { return chalk.red('>> ') + format(arguments); });
c.styleFlag('align', h.align);

// Pretty-format a word list.
function wordlist(arr) {
  return arr.map(function(item) {
    return chalk.cyan(String(item));
  }).join(', ');
}
c.styleFlag('writeFlag', function(obj, prefix) {
  var wl;
  if (Array.isArray(obj)) {
    wl = wordlist(obj);
  } else if (typeof obj === 'object' && obj) {
    wl = wordlist(Object.keys(obj).map(function(k) {
      return k + (obj[k] === true ? '' : '=' + JSON.stringify(obj[k]));
    }));
  }
  return (prefix || 'Flags') + ': ' + (wl || chalk.cyan('(none)'));
});


//
//c = c('dx');
//c.enabled = true;
//
////c.Tag.ns.show = false;
//c.setLevel('silly');
//c.no.md.silly('use __word__ to get underlined word:').md.log('__silly word__');
//c.attr({md: false}).verbose('use &verbose& to get green word:').attr({md: true}).log('&verbose&');
//c.no.md.debug('use @debug@ to get blue word:').md.log('@debug@ words after @ ... @');
//c.info('use ! to get yellow %o word: !info!', {a: true, b: null}, {a: true, b: 123});
//c.warn('use _ to get italic word: _warn_ *(not work on mac)*');
//c.ok('use * to get gray word:  *success*');
//c.error('use ** to get bold word: **error** ');
//c.no.md.fatal('use no.md to disable markdown: **fatal**');
//c.prefix.ln.ln.ok('no &color&, eol');
//
//c.write('STYLES:');
//c.title('this is title');
//c.subtitle('subtitle');
//
//c.ok({a: 1, b: true, c: null, d: '123', e: /ab/, f: new Date()});
//
//c.wrap(3).ok('are you ok? are you ok?');
//
//c.error.writeFlag({a: true, b: 'bb'});
//c.info.no.tag.writeOk('write to xxx');
//
//c.color('green.bold.underline').log('are you ok').ln();
//
//c.ok('!you should use ylog!');

//console.log(c.levels);

//function f() { throw new Error('foo') }
//  setTimeout(f, Math.random()*1000);
//  setTimeout(f, Math.random()*1000);

// npmlog debug grunt.log
// http://massalabs.com/blog/handling-errors-in-nodejs/

//c.task = function(name, fn) {
//  c.title('Start task ' + name);
//  fn.call(null, function() {
//    c.color('green').log('Done, without errors.');
//  });
//};

module.exports = c;
