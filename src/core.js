/*
 * ylog
 * https://github.com/qiu8310/ylog
 *
 * Copyright (c) 2015 Zhonglei Qiu
 * Licensed under the MIT license.
 */

var EventEmitter = require('events').EventEmitter,
  os = require('os');

var chalk = require('chalk');

var ns = require('./ns'),
  h = require('./helper');


var eve = new EventEmitter();
var defaultYlog, ylogProtoKeys;


/*

 特点：

 - 支持 npmlog 的 level 级别
 - 支持 debug 的环境变量设置
 - 支持 debug 的分类输出 @TODO
 - 支持 进度条 输出 @TODO
 - 支持 事件监听 @TODO
 - 支持 显示执行时间 @TODO
 - 支持 显示进程 ID @TODO
 - 支持 grunt log 的丰富样式
 - 支持 prettyJson
 - 支持 error stack
 - 支持指定每行的输出宽度（使用 wrap，支持使用指定的整数宽度、百分比或小数，如 `ylog.wrap(0.8).info('...')`）
 - 支持简单的类似于 markdown 的语法
 */


// 用于生成链式结构的 prototype
var ylogChainProto = {},
  ylogProto = require('./core-proto');


// bind event's emit, on, once function to ylogProto, and ylogChainProto
['emit', 'on', 'once'].forEach(function(key) {
  ylogProto[key] = eve[key].bind(eve);
  ylogChainProto[key] = eve[key].bind(eve);
});


// 短名字引用
var levels = ylogProto.levels,
  styles = ylogProto.styles,

  attributes = ylogProto.attributes,
  Tag = ylogProto.Tag;


function argsToStr(args)  { return ylogProto.format.apply(ylogProto, args); }
function write()          { ylogProto.output(argsToStr(arguments)); }
function writeln()        { ylogProto.output(argsToStr(arguments) + os.EOL); }
function md(str)          {
  return str.replace(ylogProto.markdownRegExp, function(raw, left, key, word) {
    var color = ylogProto.markdowns[key];
    if (!color) { return raw; }
    return left + ylogProto.brush(word, color);
  });
}

var randomBrushSeeds = {};
function randomBrush(text, seed)    {
  seed = seed || 'default';
  if (!(seed in randomBrushSeeds)) { randomBrushSeeds[seed] = 0; }
  var index = randomBrushSeeds[seed], len = ylogProto.colors.length;
  randomBrushSeeds[seed] = index + 1;
  return ylogProto.brush(text, ylogProto.colors[index % len]);
}


/**
 * 注入 flag ， 使其可以链式调用
 * @param {String} flag
 */
function appendFlag(flag) {
  // Object.keys 不会输出用 defineProperty 定义的属性
  if (!ylogProtoKeys) { ylogProtoKeys = Object.keys(ylogProto).concat(['namespace', 'enabled']); }
  if (ylogProtoKeys.indexOf(flag) >= 0) {
    throw new Error('Flag <' + flag + '> is occupied by ylog prototype');
  }

  // 如果 flag 已经定义了，就不用再定义了，再定义也是一样，没区别
  if (flag in ylogProto) { return false; }

  var initYlog = function() {
    return chain([flag], {calledCount: 0, attributes: {}}, this);
  };

  var getProperty = function () {
    this.flags.push(flag);
    return chain(this.flags, this.options, this.ylog);
  };

  // Object.defineProperty(Ylog.prototype, flag, {get: initYlog});

  // 形式一：ylog.log 或 ylog('xx').log
  Object.defineProperty(ylogProto, flag, {get: initYlog});

  // 形式二：第 2+ 级的链式调用，如 ylog.log.write 或 ylog('xx').log.write, 它们在执行 write 的时候会触发此
  Object.defineProperty(ylogChainProto, flag, {get: getProperty});

}

// ylog generator
function makeYlog(namespace, enabled) {
  // 没有指定 namespace 则表示默认使用 defaultYlog
  // 只备份这个 default，其它的 namespace 没必要备份，因为一般像 debug 一样，只会调用一次
  if (!namespace && defaultYlog) { return defaultYlog; }

  var fn = function ylog(namespace) {
    return makeYlog(namespace, ns.enabled(namespace));
  };

  if (!namespace) {
    fn.namespace = '';
    fn.enabled = true;
    defaultYlog = fn;
  } else {
    // 添加颜色值
    fn.namespace = chalk.hasColor(namespace) ? namespace : randomBrush(namespace, 'ns');
    fn.enabled = enabled;
  }

  /* jshint ignore:start */
  fn.__proto__ = ylogProto;
  /* jshint ignore:end */

  return fn;
}

/**
 * 每次链式调用都重新生成一个函数，并且函数又支持链式调用
 * @param {Array} flags
 * @param {Object} options
 * @param {Object} ylog
 * @returns {Function}
 */
function chain(flags, options, ylog) {
  var caller = function ylogChain() {
    return call.apply(caller, arguments);
  };
  caller.flags = flags;
  caller.options = options;
  caller.ylog = ylog;
  // __proto__ is used because we must return a function, but there is
  // no way to create a function with a different prototype.

  /* jshint ignore:start */
  caller.__proto__ = ylogChainProto;
  /* jshint ignore:end */

  return caller;
}


var transforms = ylogProto.attributeTransforms;
function setAttribute(flag, args, options, batch) {
  var trans = transforms[flag];
  var val = args[0];
  switch (trans) {
    case Boolean:
      val = !!val;
      break;
    case Number:
      if (typeof val === 'boolean') {
        val = val ? 1 : 0;
        if (val && !batch) {
          val = getAttribute(flag, options) + val;
        }
      } else {
        val = parseInt(val, 10);
        val = isNaN(val) ? 1 : val;
      }
      break;
    case String:
      if (typeof val !== 'string') {
        return false;
      }
      break;
    default :
      if (typeof trans === 'function') {
        val = trans.apply(null, args);
      }
  }

  options.attributes[flag] = val;
}

function getAttribute(flag, options) {
  return ( flag in options.attributes ) ? options.attributes[flag] : ylogProto.attributes[flag];
}

/**
 * 分析 flags，返回其中的 levels 和 styles，并且设置上面的 attributes 到 options.attributes 中
 * @param {Array} flags
 * @param {Arguments} args
 * @param {Object} options
 */
function parseFlags(flags, args, options) {
  var i, flag, len = flags.length, no;
  var result = {levels: [], styles: []};
  for (i = 0; i < len; i++) {
    flag = flags[i];
    no = false;

    while (flag === 'no') {
      flag = flags[++i];
      no = !no;
    }

    if (flag.indexOf('no') === 0) {
      no = !no;
      flag = flag.substr(2);
    }

    if (flag === 'attr' || (flag in attributes)) {

      // attr 的参数必须要是个对象
      if (flag === 'attr') {
        /* jshint ignore:start */
        if (args.length && i === len - 1) {
          Object.keys(args[0]).forEach(function(key) {
            setAttribute(key, [args[0][key]], options, true);
          });
        }
        /* jshint ignore:end */
      } else {
        setAttribute(flag, args.length && i === len - 1 ? args : [!no], options);
      }
    }

    if (flag) {
      if (flag in levels) {
        result.levels.push(flag);
      } else if (flag in styles) {
        result.styles.push(flag);
      }
    }
  }

  return result;
}


function getFnResult(fn, args, ctx) {
  var result = fn.apply(ctx, args || []);
  return typeof result === 'undefined' ? '' : result;
}

var lastEOL = true; // 记录是否需要输出换行符（第一次输出不需要换行）
/**
 * 函数形式的链式调用会执行此函数
 */
function call() {
  var flags = this.flags,
    options = this.options,
    ylog = this.ylog;

  var rtn = chain([], options, ylog);

  // 如果 disabled， 则直接返回即可
  if (!ylog.enabled) { return rtn; }

  // 获取指定的 level 级别
  var parsed = parseFlags(flags, [].slice.call(arguments), options),
    flagLevels = parsed.levels,
    flagStyles = parsed.styles,
    flagLevel;

  // 如果上次使用了 level，则把它导入到此次的 call 中
  if (options.level) { flagLevels.push(options.level); }
  flagLevel = getCallLevel(flagLevels);
  options.level = flagLevel; // 保存当前 level

  // 用户指定了 level，但没有用户要的 level；或者指定的 level 就是 silent
  if (flagLevels.length && !flagLevel || flagLevel === 'silent') { return rtn; }

  // 没有输出，也直接返回
  if (!flagStyles.length && !flagLevels.length) { return rtn; }

  // 根据 attributes 输出 styles
  var label = '', buffer = [], lastFlag = h.last(flags), i;
  if (options.calledCount === 0) {
    if (!lastEOL) { writeln(); }

    if (getAttribute('tag', options)) {
      label = getLabel({
        pid: ylogProto.brush(process.pid, Tag.pid.color),
        ns: ylog.namespace,
        level: flagLevel && levels[flagLevel].tag
      });

      if (label) {
        if (ylog.namespace && Tag.ns.show) {
          label = h.repeat(getAttribute('nsPadChar', options), getAttribute('nsPad', options)) + label;
        }
        label += ' ';
      }

      var labelArgs = getAttribute('label', options);
      if (labelArgs && typeof labelArgs[0] === 'string') {
        label += h.align.apply(h, labelArgs) + ' ';
      }
    }
    label = h.repeat(getAttribute('padChar', options), getAttribute('pad', options)) + label;

    options.label = label;
    options.labelLength = chalk.stripColor(label).length;

    write(label); // label 一定要输出来
  }

  // 最后一个 flag 肯定要单独处理
  if (lastFlag === h.last(flagStyles)) { flagStyles.pop(); }

  for (i = 0; i < flagStyles.length; i++) {
    buffer.push(getFnResult(styles[flagStyles[i]], [], options));
  }

  // 运行最后一个 flag，它是可能带有参数的
  if (lastFlag in levels) {
    buffer.push(argsToStr(arguments));
  } else if (lastFlag in styles) {
    buffer.push(getFnResult(styles[lastFlag], arguments, options));
  }

  // 没有东西可输出，直接返回
  if (!label && !buffer.length) { return rtn; }


  // 开始处理输出（如果上一个带有换行，下次输出就不用加空格了
  var output = '', reLastEOL = /\n$/, joinGlue = '';
  for (i = 0; i < buffer.length; i++) {
    output += joinGlue + buffer[i];
    joinGlue = reLastEOL.test(buffer[i]) ? '' : ' ';
  }

  // markdown
  if (getAttribute('md', options)) { output = md(output); }

  var eol = getAttribute('eol', options);
  output += h.repeat(os.EOL, eol - 1); // 留一个到最前面输出

  // 如果 attributes 中有设置了 no.eol，则表示下次不要输出换行符了
  lastEOL = eol < 1;

  // 设置颜色
  var color = getAttribute('color', options);
  if (color === false) {
    output = chalk.stripColor(output);
  } else if (typeof color === 'string') {
    output = ylogProto.brush(output, color);
  }

  // 在同一行上做第 2+ 次输出，要在前面加个空格（在设置了颜色之后，不想要这个 ' ' 也带有颜色）
  if (options.calledCount > 0 && !options.ln) { output = ' ' + output; }

  // wrap output
  var wrap = getAttribute('wrap', options);
  output = ylogProto.computeWrap(wrap, output, options.labelLength);

  // prefix output
  if (options.label && output) {
    var prefix = getAttribute('prefix', options);
    var outputPad = prefix ? options.label : h.repeat(' ', options.labelLength);

    // 上次输出了换行，则此行默认就得带上前缀
    output = ((options.ln ? outputPad : '') + output).replace(/\n(?=[^\n]+)/g, function(raw) {
      return raw + outputPad;
    });
  }

  eve.emit([chalk.stripColor(ylog.namespace) || '', flagLevel || ''].join('.'), output);

  write(output);

  options.calledCount++;
  options.ln = reLastEOL.test(output); // 判断最后一个字符是不是换行，如果是，第二次输出的时候不需要带 ' '
  return rtn;
}


/**
 * 对 levels 排序的一个帮助函数
 * @param {String} a
 * @param {String} b
 * @returns {number}
 */
function sortLevels (a, b) { return levels[a].weight - levels[b].weight; }

/**
 * 从 levelFlags 中选出一个 level 来使用
 * @param {Array} levelFlags
 */
function getCallLevel(levelFlags) {
  levelFlags = [].concat(levelFlags);

  if (!ylogProto.level || !levelFlags.length) {
    return levelFlags.sort(sortLevels).pop(); // 返回一个权重最最的即可
  }

  var userLevels = [].concat(ylogProto.level), // clone 一份，防止修改了原数据，同时将其转化成数组
    level;

  if (ylogProto.levelMode === 'only') {
    // 从 userLevels 中选一个存在 levelFlags 中的权重最高的 level
    userLevels.forEach(function(flag) {
      if (levelFlags.indexOf(flag) >= 0) {
        if (!level || levels[flag].weight > level.weight) {
          level = flag;
        }
      }
    });
  } else {

    // 从 userLevels 中选一个权重最低的，然后再在 levelFlags 中选一个比 userLevels 中权重最低的要高的一个最高的 level
    var min = userLevels.sort(sortLevels).shift();
    var max = levelFlags.sort(sortLevels).pop();
    if (levels[min].weight <= levels[max].weight) {
      level = max;
    }
  }
  return level;
}

function getLabel(opts) {
  return Object.keys(Tag)
    .filter(function(key) { return Tag[key].show && opts[key]; })
    .sort(function(k1, k2) { return Tag[k1].order - Tag[k2].order; })
    .map(function(key) {
      var cfg = Tag[key];
      return h.align(opts[key], (cfg.len < 0 && cfg.max ? cfg.max : cfg.len), cfg.align, cfg.fill);
    }).join(' ');
}


/**
 * 添加或修改 Level Flag
 *
 * @param {String} name - 级别名称
 * @param {Number} weight - 级别权重，越小优先级越高
 * @param {String} tag - 指定最左边显示的标识（如果没有，则使用级别的名称，即 name）
 */
ylogProto.levelFlag = function(name, weight, tag) {
  tag = tag || name;

  var tagLen = chalk.stripColor(tag).length;
  if (!Tag.level.max || tagLen > Tag.level.max) {
    Tag.level.max = tagLen;
  }

  levels[name] = {
    weight: weight,
    tag: tag
  };

  appendFlag(name);
};


/**
 * 添加或修改 Style Flag
 *
 * @param {String} name - 样式名称
 * @param {Function} fn - 样式处理程序，fn 绑定在了 chalk 之上，所以你可以在 fn 中使用 this.red.bgGreen 等 chalk 方法
 */
ylogProto.styleFlag = function(name, fn) {
  styles[name] = fn;
  appendFlag(name);
};



// 注入属性 flag
appendFlag('no');
appendFlag('attr');
Object.keys(attributes).forEach(function(key) {
  appendFlag(key);
  appendFlag('no' + key);
});


// 总是在程序最后输出一个换行符
process.on('exit', function() { writeln(); });


module.exports = makeYlog();
