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
      var z = ylog();
      y.enabled.should.eql(true);
      z.enabled.should.eql(true);
      z.should.eql(y);

      testOut(function() {
        y.write('abc');
        z.write('def');
      }, /^abc\ndef$/);


      // you can also disable it
      y.enabled = false;
      z.enabled = false;

      y.write('xx');
      z.write('yy');

      out.should.eql('');

      // recover it, because others rely on it
      y.enabled = true;
      z.enabled.should.eql(true);
    });

    it('should support a colored namespace', function() {
      var y = ylog(chalk.red('hah'));
      y.enabled = true;

      testOut(function() {
        y.log('aa');
      });
      out2.should.eql('\n   ' + chalk.red('hah') + ' aa');
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

    it('should throw when set no exist level', function() {
      (function() {
        ylog.setLevel('no_exist_xx');
      }).should.throw();
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

    it('should support multiple levels', function() {
      ylog.setLevel(['ok', 'info'], 'only');
      testOut(function() {
        ylog.ok.info('xx');
      });
      out2.should.eql('\n ' + ylog.levels.ok.tag + '  xx');

      ylog.setLevel('silly', 'weight');
      testOut(function() {
        ylog.info.ok('xx');
      });
      out2.should.eql('\n ' + ylog.levels.ok.tag + '  xx');
    });

  });

  context('attribute', function() {

    it('md', function() {
      testOut(function() {
        ylog.md.log('**xx** yy')
      }, 'xx yy');

      testOut(function() {
        ylog.no.md.log('**xx**');
      }, '**xx**');

      testOut(function() {
        ylog.nomd.log('**xx**');
      }, '**xx**');
    });

    it('useless no tag', function() {
      testOut(function() {
        ylog.no.log('ab');
      }, 'ab');
    });

    it('tag', function() {
      testOut(function() {
        ylog.debug.tag.log('xx');
      }, '[D] xx');

      testOut(function() {
        ylog.debug.no.tag.log('xx');
      }, '\nxx', {trim: false});
    });

    it('pad', function() {
      testOut(function() {
        ylog.pad(3).padChar('-').log('xx');
      }, '\n---xx', {trim: false});

      testOut(function() {
        ylog.pad(2).padChar(true).log('xx');
      }, '\n  xx', {trim: false});
    });

    it('attr', function() {
      testOut(function() {
        var a = ylog.attr({md: false, color: 'red', wrap: false}).log('ab**cd**ef');
      });
      out2.should.eql('\n' + chalk.red('ab**cd**ef'));
    });

    it('eol', function() {
      testOut(function() {
        ylog.eol.ln('you');
      }, '\n\nyou\n', {trim: false});

      testOut(function() {
        ylog.eol('xx').ln('you');
      }, '\n\nyou', {trim: false});

      testOut(function() {
        ylog.eol(3).ln('you');
      }, '\n\nyou\n\n', {trim: false});

      testOut(function() {
        ylog.no.eol.log('are');
        ylog.log('you');
      }, '\nareyou', {trim: false});
    });

    it('color', function() {
      testOut(function() {
        ylog.no.wrap.color('red.bold').write('ab');
      });
      out2.should.eql('\n' + chalk.red.bold('ab'));

      testOut(function() {
        ylog.no.wrap.write('a').color('red').write('b').write('c');
      });
      out2.should.eql('\na ' + chalk.red('b') + ' ' + chalk.red('c'));


      testOut(function() {
        ylog.no.wrap.write('a').color('red').write('b').color('green').write('c');
      });
      out2.should.eql('\na ' + chalk.red('b') + ' ' + chalk.green('c'));

    });

    it('nocolor', function() {
      testOut(function() {
        ylog.color('red').no.color.log('abc');
      });
      out2.should.eql('\nabc');
    });

    it('wrap', function() {
      testOut(function() {
        ylog.wrap(3).log('areyouok!')
      }, '\nare\nyou\nok!', {trim: false});

      testOut(function() {
        ylog.wrap(3).log(chalk.red.underline('are') + chalk.green('youok!'))
      }, '\nare\nyou\nok!', {trim: false});

      var y = ylog.wrap(0.6).log('a');
      y.options.attributes.wrap.should.eql(0.6);

      y = ylog.wrap('60%').log('a');
      y.options.attributes.wrap.should.eql('60%');

    });

    it('label', function() {
      testOut(function() {
        ylog.label('ab', 4).log('def');
      }, 'ab   def');

      testOut(function() {
        ylog.label('ab', 4, 'right').log('def');
      }, 'ab def');

      testOut(function() {
        ylog.label('ab', 5, 'center').log('def');
      }, 'ab  def');
    });

  });

  context('style', function() {
    it('ln', function() {
      testOut(function() {
        ylog.ln.ln('abc');
      }, '\n\n\nabc', {trim: false})
    });
    it('log', function() {
      testOut(function() {
        ylog.log('abc');
      }, 'abc')
    });
    it('write', function() {
      testOut(function() {
        ylog.write('abc');
      }, 'abc')
    });
    it('title', function() {
      testOut(function() {
        ylog.title('abc');
      }, 'Abc');
    });
    it('subtitle', function() {
      testOut(function() {
        ylog.subtitle('abc');
      }, 'Abc')
    });
    it('writeOk', function() {
      testOut(function() {
        ylog.writeOk('abc');
      }, '>> abc')
    });
    it('writeError', function() {
      testOut(function() {
        ylog.writeError('abc');
      }, '>> abc')
    });
    it('writeFlag', function() {
      testOut(function() {
        ylog.writeFlag(['a', 'b']);
      }, 'Flags: a, b');

      testOut(function() {
        ylog.writeFlag({a: true, b: 'abc'}, 'XX');
      }, 'XX: a, b="abc"');

      testOut(function() {
        ylog.writeFlag(false);
      }, 'Flags: (none)');
    });
    it('align', function() {
      // attribute 中的 label 已经测试过此
      testOut(function() {
        ylog.align('d');
      }, 'd');
    });
  });

  context('new flag', function() {
    it('create occupied flag should throw error', function() {
      (function() {
        ylog.styleFlag('namespace');
      }).should.throw();

      (function() {
        ylog.styleFlag('levels');
      }).should.throw();
    });

    it('create exists flag should successed', function() {
      (function() {
        ylog.styleFlag('md');
      }).should.not.throw();

      (function() {
        ylog.styleFlag('tag');
      }).should.not.throw();
    });

    it('create new level', function() {
      ylog.levelFlag('fuck', 4500);
      testOut(function() {
        ylog.fuck('no body');
      }, 'fuck no body');
    });
  });

  context('format output', function() {
    it('ylog.format', function() {
      // o, j, f, d, s
      testOut(function() {
        ylog.log('|%o %j %f %d %s %% %z|', {a: 1}, 'a', '1.2', '3', 'b')
      }, '|{ a: 1 } "a" 1.2 3 b % %z|');


      testOut(function() {
        ylog.log(['1', 2], 1);
      }, /^\[ ['"]1['"], 2 \] 1$/ );


      testOut(function() {
        ylog.log(new Error('x'));
      }, 'Error: x', {useIndexOf: true});

    });

    it('ylog.brush', function() {
      ylog.brush('ab', 'red.green').should.eql(chalk.red.green('ab'));
      (function() {ylog.brush('ab', 'red.xgreen')}).should.throw();
      ylog.brush('ab', '').should.eql('ab');

    });
  });

  context('config', function() {
    it('disable some markdown', function() {
      ylog.markdowns['**'] = false;
      testOut(function() {
        ylog.log('**xx**');
      }, '**xx**');
      ylog.markdowns['**'] = true;
    });

    it('hide ns tag', function() {
      ylog.Tag.ns.show = false;
      var y = ylog('ab');
      y.enabled = true;
      testOut(function() {
        y.log('xx');
      }, 'xx');
      ylog.Tag.ns.show = true;
    });

    it('show pid tag', function() {
      ylog.Tag.pid.show = true;
      testOut(function() {
        ylog.log('xx');
      }, /^\d+ xx$/);
      ylog.Tag.pid.show = false;
    });

    it('ns tag align', function() {
      var ab = ylog('ab');
      var abc = ylog('abc');
      ab.enabled = true;
      abc.enabled = true;

      testOut(function() {
        ylog.Tag.ns.align = 'left';
        ylog.Tag.ns.len = 4;

        ab.log('ab');
        abc.log('bc');
      }, '\n   ab   ab\n   abc  bc', {trim: false});

      testOut(function() {
        ylog.Tag.ns.align = 'right';
        ylog.Tag.ns.len = 4;

        ab.log('ab');
        abc.log('bc');
      }, '\n     ab ab\n    abc bc', {trim: false});

      ylog.Tag.ns.len = 0;

    });

    it('re-order ns and level tag', function() {
      ylog.Tag.ns.order = 40;

      testOut(function() {
        var y = ylog('y');
        y.enabled = true;
        y.debug('c');
      }, '[D] y c');

      ylog.Tag.ns.order = 20;
    });

    it('prefixLabelEachLine', function() {
      ylog.attributes.prefix = true;

      testOut(function() {
        var y = ylog('ab');
        y.enabled = true;
        y.wrap(3).log('areyouok!');
      }, '\n   ab are\n   ab you\n   ab ok!', {trim: false});

      ylog.attributes.prefix = false;
    });
  });


  context('label group', function() {

  });


  context('event', function() {
    it('should emit sys.[ns].[level]', function() {
      var a = 0;
      var y = ylog('ab');
      y.enabled = true;

      ylog.on('ab.ok', function() {
        a++;
      });

      y.ok(1);
      y.ok(2);
      y.error(2);
      y.debug(2);

      a.should.eql(2);

    });
  });

});
