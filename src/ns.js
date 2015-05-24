/*
 * ylog
 * https://github.com/qiu8310/ylog
 *
 * Copyright (c) 2015 Zhonglei Qiu
 * Licensed under the MIT license.
 */

//! @NOTE 此部分代码灵感来自于 https://github.com/visionmedia/debug


var names = [];
var skips = [];


/**
 * 判断此 namespace 是否应该启用
 * @param {String} namespace
 * @returns {Boolean}
 */
function enabled(namespace) {
  var i, len;
  for (i = 0, len = skips.length; i < len; i++) {
    if (skips[i].test(namespace)) { return false; }
  }
  for (i = 0, len = names.length; i < len; i++) {
    if (names[i].test(namespace)) { return true; }
  }
  return false;
}


/**
 * 启用指定的 namespace
 *
 * @param {String} namespaces
 */

function enable(namespaces) {

  process.env.YLOG = namespaces;

  var split = (namespaces || '').split(/[\s,]+/);
  var len = split.length;
  var ns, i;

  for (i = 0; i < len; i++) {
    if (!split[i]) { continue; } // ignore empty strings
    ns = split[i].replace(/\*/g, '.*?');
    if (ns[0] === '-') {
      skips.push(new RegExp('^' + ns.substr(1) + '$'));
    } else {
      names.push(new RegExp('^' + ns + '$'));
    }
  }
}


// 用 process.env.YLOG 初始化
enable(process.env.YLOG);

module.exports = {enable: enable, enabled: enabled};

