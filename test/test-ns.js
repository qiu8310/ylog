/*
 * ylog
 * https://github.com/qiu8310/ylog
 *
 * Copyright (c) 2015 Zhonglei Qiu
 * Licensed under the MIT license.
 */

var ns = require('../src/ns.js');
var assert = require('should');

describe('ns', function() {

  it('basic', function() {
    ns.enable('ab,cd');
    ns.enabled('ab').should.eql(true);
    ns.enabled('cd').should.eql(true);
    ns.enabled('bc').should.eql(false);
  });

  it('asterisk', function() {
    ns.enable('a*,a:*');
    ns.enabled('a').should.eql(true);
    ns.enabled('ab').should.eql(true);
    ns.enabled('a:').should.eql(true);
    ns.enabled('a:cd').should.eql(true);
    ns.enabled('ba').should.eql(false);
  });
  it('exclude', function() {
    ns.enable('a*,-a:*');
    ns.enabled('a').should.eql(true);
    ns.enabled('ab').should.eql(true);
    ns.enabled('a:').should.eql(false);
    ns.enabled('a:bb').should.eql(false);
  });


});

