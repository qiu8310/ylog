'use strict';


/*
  ASSERT:
    ok(value, [message]) - Tests if value is a true value.
    equal(actual, expected, [message]) - Tests shallow, coercive equality with the equal comparison operator ( == ).
    notEqual(actual, expected, [message]) - Tests shallow, coercive non-equality with the not equal comparison operator ( != ).
    deepEqual(actual, expected, [message]) - Tests for deep equality.
    notDeepEqual(actual, expected, [message]) - Tests for any deep inequality.
    strictEqual(actual, expected, [message]) - Tests strict equality, as determined by the strict equality operator ( === )
    notStrictEqual(actual, expected, [message]) - Tests strict non-equality, as determined by the strict not equal operator ( !== )
    throws(block, [error], [message]) - Expects block to throw an error.
    doesNotThrow(block, [error], [message]) - Expects block not to throw an error.
    ifError(value) - Tests if value is not a false value, throws if it is a true value. Useful when testing the first argument, error in callbacks.

  SHOULD.JS:
    http://shouldjs.github.io/

  Some test frameworks:
    sinon:  function spy
    nock: mock http request
    supertest: test http server
    rewire: modify the behaviour of a module such that you can easily inject mocks and manipulate private variables

  More on http://www.clock.co.uk/blog/tools-for-unit-testing-and-quality-assurance-in-node-js
*/

var ylog = require('../');
var assert = require('should');
var chalk = require('chalk');
var _ = require('lodash');

var out = '';
var out2 = '';
ylog.__proto__.output = function(str) { out += chalk.stripColor(str); out2 += str;  };

function match(target, expected, useIndexOf) {
  if (expected instanceof RegExp) {
    target.should.match(expected);
  } else {
    if (useIndexOf) {
      target.should.containEql(expected);
      target.should.not.eql(expected);
    } else {
      target.should.eql(expected);
    }
  }
}

function testOut(fn, strOrRe, opts) {
  opts = opts || {};
  out = '';
  out2 = '';
  fn();
  if (opts.trim !== false) {
    out = out.trim();
  }
  out = out.replace(/[\r]/g, '');

  var res = out;
  out = '';

  if (strOrRe) {
    match(res, strOrRe, opts.useIndexOf);
  }

  return res;
}

function testLevel(level, text, expected) {
  var res = testOut(function() {
    ylog[level](text);
  });

  if (level === 'silent') {
    res.should.eql('');
  } else {
    if (expected) {
      var tag = chalk.stripColor(ylog.levels[level].tag).trim();
      res.indexOf(tag).should.eql(0);
      res = res.replace(tag, '').trim();
    }
    res.should.eql(expected);
  }
}


describe('ylog', function () {

  beforeEach(function() {
    out = '';
  });

  context('namespace', function() {

    it('should support debug package namespace property', function () {
      var y1 = ylog('y1'),
        y2 = ylog('y2');

      y1.enabled.should.eql(false);
      y2.enabled.should.eql(false);

      // y1 and y2 are disabled
      testOut(function() {
        y1.write('y1');
        y2.write('y2');
      }, '');


      // y1 is enabled and y2 is disabled
      y1.enabled = true;
      testOut(function() {
        y1.write('y1');
        y2.write('y2');
      }, 'y1 y1');


      // y1 and y2 are enabled
      y2.enabled = true;
      testOut(function() {
        y1.write('y1');
        y2.write('y2');
      }, /y1 y1\s+y2 y2/);

      // y1 is disabled and y2 is enabled
      y1.enabled = false;
      testOut(function() {
        y1.write('y1');
        y2.write('y2');
      }, 'y2 y2');
    });

    it('should support no namespace', function() {
      var y = ylog;
      y.enabled.should.eql(true);

      testOut(function() {
        y.write('abc');
        y.write('def');
      }, /^abc\ndef$/);


      // you can also disable it
      y.enabled = false;

      y.write('xx');
      y.write('yy');

      out.should.eql('');

      // recover it, because others rely on it
      y.enabled = true;
    });

  });

  context('level', function() {
    var levels, first, last, second, third, forth;
    before(function() {
      levels = _.keys(ylog.levels).sort(function(a, b) { return ylog.levels[a].weight - ylog.levels[b].weight; });
      first = _.first(levels);
      second = levels[1];
      third = levels[2];
      forth = levels[3];
      last = _.last(levels);

      // 全部输出模式
      ylog.setLevel(first);
    });

    after(function() {
      ylog.setLevel(first);
      ylog.setLevelMode('weight');
    });

    it('should output a prefixed tag', function() {
      _.each(levels, function(level) {
        var tag = chalk.stripColor(ylog.levels[level].tag);
        var re = new RegExp(tag.replace(/([\[\]])/g, '\\$1') + '\\s*' + level);

        testOut(function() {
          ylog[level](level);
        }, level === 'silent' ? '' : re);
      });
    });

    it('should support setLevelMode("weight")', function() {
      ylog.setLevelMode('weight');

      // 当当前 level 权限高的才会输出，除了 silent
      ylog.setLevel(second);
      testLevel(first, 'will not output', '');
      testLevel(second, 'output this', 'output this');
      testLevel(third, 'hi', 'hi');

      ylog.setLevel(third);
      testLevel(first, 'no', '');
      testLevel(second, 'no', '');
      testLevel(forth, 'yes', 'yes');

    });

    it('should support setLevelMode("only")', function() {
      ylog.setLevelMode('only');

      ylog.setLevel(second);

      levels.forEach(function(level) {
        testLevel(level, level, level === second ? level : '');
      });

      ylog.setLevel(last);
      levels.forEach(function(level) {
        testLevel(level, level, '');
      });

      var g = [second, forth];
      ylog.setLevel(g);
      levels.forEach(function(level) {
        testLevel(level, level, _.includes(g, level) ? level : '');
      });

    });

  });
  context('modifier', function() {

    it('md', function() {
      testOut(function() {
        ylog.md('**xx** yy')
      }, 'xx yy');

      testOut(function() {
        ylog.no.md('**xx**');
      }, '**xx**');

      testOut(function() {
        ylog.nomd('**xx**');
      }, '**xx**');
    });

    it('tag', function() {
      testOut(function() {
        ylog.debug.tag('xx');
      }, '[D] xx');

      testOut(function() {
        ylog.debug.no.tag('xx');
      }, '\n    xx', {trim: false});
    });

    it('ln & eol', function() {
      testOut(function() {
        ylog.ln('are');
        ylog.eol.ln('you');
      }, '\nare\n\nyou\n\n', {trim: false});

      testOut(function() {
        ylog.no.ln('are');
        ylog.log('you');
      }, '\nareyou', {trim: false})
    });

    it('color', function() {
      testOut(function() {
        ylog.color('red.bold').write('ab');
      });
      out2.should.eql('\n' + chalk.red.bold('ab'));

      testOut(function() {
        ylog.write('a').color('red').write('b').write('c');
      });
      out2.should.eql('\na ' + chalk.red('b') + ' ' + chalk.red('c'));


      testOut(function() {
        ylog.write('a').color('red').write('b').color('green').write('c');
      });
      out2.should.eql('\na ' + chalk.red('b') + ' ' + chalk.green(chalk.green('c')));

    });

    it('wrap', function() {
      testOut(function() {
        ylog.wrap(3).log('areyouok!')
      }, '\nare\nyou\nok!', {trim: false});
    });

  });
  context('style', function() {

  });

});
