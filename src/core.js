/*
 * ylog
 * https://github.com/qiu8310/ylog
 *
 * Copyright (c) 2015 Zhonglei Qiu
 * Licensed under the MIT license.
 */

var EventEmitter = require('events').EventEmitter,
  util = require('util'),
  os = require('os');

var chalk = require('chalk');

var ns = require('./ns');
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


 allFlags: (按 levels -> styles -> modifiers 的顺序执行)


 levels:
   silly
   verbose
   info
   http
   warn
   ok
   error
   fatal

 styles:
   title
   subtitle
   write

 modifiers: (在文本输出前的最后一刻执行)
   noln    - 不要换行
   noeol   - 和 noln 一样
   nocolor - 输出的内容不带任何的样式
   nomd    - 不要使用类 markdown 的语法
   silent  - 无任何输出

   stack - 输出 error.stack @TODO
   wrap  - 指定输出文本的最大宽度

   @TODO
   prettyColor?
   human
   time
   profile
 */


// 用于生成链式结构的 prototype
var ylogChainProto = {},

  ylogProto = {

    // 传入用户可能需要用到的库
    chalk: chalk,


    levels: {},     // 所有的用 ylog.levelFlag 定义的 level 都保存在这
    styles: {},     // 所有的用 ylog.styleFlag 定义的 style 都保存在这
    modifiers: {},  // 所有的用 ylog.modifierFlag 定义的 modifier 都保存在这


    // 输出日志是显示在日志最左边的 process id, namespace 和 level
    // 可以定义它们显示的长度，对齐方式，及是否显示，还有显示顺序等
    Tag: {
      pid:  {len:  5, align: 'right', fill: ' ', order: 10, show: false, color: 'gray' }, // color 只对 pid 有效
      ns:   {len:  0, align: 'left',  fill: ' ', order: 20, show: true  },
      level:{len: -1, align: 'center',fill: ' ', order: 30, show: true, max: 3} // 如果 len < 0，则会使用 max 属性当 len
    },


    // 指定当前的日志级别，如果没有指定，则输出所有级别的日志
    // 同时可以指定成数组（主要是 levelMode = 'only' 时非常有用）
    // 请使用 ylog.setLevel 设置此参数
    level: null,

    // only 和 weight 两种形式：
    // only 表示只显示 level 所指定的日志级别；而 weight 表示显示大于等于 level 的级别的所有日志
    // 请使用 ylog.setLevelMode 设置此参数
    levelMode: 'weight',

    // 在某一次输出中，可以会包含多行，你是否需要在每行的前面都输出 pid/ns/level 这些 label 呢？
    prefixLabelEachLine: false,


    /**
     * 定义 markdown 替换的规制
     *
     *  - 样式支持同时写多个，比如 "bold.gray"，则加粗的同时还会使字体变灰
     *  - 如果你不想要这个样式，只要将它设置成 false 即可
     *  - 如果你要添加新的标签，你要同时修改 markdownRegExp 中的正则表达式（建议不要这样做）
     *
     * @example
     *
     *  如果出现 "are **you** ok"，则 you 会使用 markdowns.** 中所指定的样式
     */
    markdown: {
      '**': 'bold',
      '*': 'gray',
      '__': 'underline',
      '_': 'italic',
      '!': 'yellow',
      '@': 'blue',
      '&': 'green'
    },

    // 配合 markdown 用的
    markdownRegExp: /(\s|^)(\*\*|\_\_|\*|\_|\!|@|&)([^\*\_\s]|[^\*\_\s][\s\S]*?[^\*\_\s])\2(?=[\s,.!?]|$)/g,


    // 给 ylog.format 用的
    formats: {
      o: function(v) { return util.inspect(v, {colors: true, depth: 2}).replace(/\s*\n\s*/g, ' '); },
      j: function(v) { return JSON.stringify(v); },
      d: function(v) { return parseInt(v, 10); },
      f: function(v) { return parseFloat(v); },
      s: function(v) { return String(v); }
    },

    /**
     * 类似于 util.format
     */
    format: function() {
      var tpl, args = [];

      if (!arguments.length) { return ''; }

      // don't slice `arguments`, it prevents v8 optimizations
      for (var i = 0; i < arguments.length; i++) { args[i] = arguments[i]; }

      if (typeof args[0] !== 'string') {
        args[0] = coerce(args[0]);
        tpl = '%o';   // 第一个参数总是当 Object 输出
      } else {
        tpl = args.shift();
      }

      tpl = tpl.replace(/%([a-z%])/, function(raw, key) {
        if (key === '%') { return '%'; }
        if (key in ylogProto.formats) {
          return ylogProto.formats[key](args.shift());
        }
      });

      args.unshift(tpl);
      return args.join(' ');
    },

    /**
     * 对于需要颜色的标签，可以从 colors 中按获取顺序取出下一个给标签使用
     *
     * @example
     * namespace 的标签的颜色就是从这里取的
     */
    colors: ['cyan', 'green', 'yellow', 'blue', 'magenta', 'gray'],


    /**
     * 用指定的 color 对 text 处理，可以同时指定多个颜色：如 'bold.green'
     *
     * @param {String} text
     * @param {String} color
     * @returns {String}
     */
    brush: function(text, color) {
      color = color.trim();
      if (!color) { return text; }
      var brusher = chalk;
      color.split(/\s*[.,\s]\s*/).forEach(function(c) {
        brusher = brusher[c];
        if (!brusher) { throw new Error('Style <' + c + '> not exists in chalk!'); }
      });
      return brusher(text);
    },

    // 所有的输出都是走此函数
    output: function(str) { process.stdout.write(str); }
  };


// bind event's emit, on, once function to ylogProto, and ylogChainProto
['emit', 'on', 'once'].forEach(function(key) {
  ylogProto[key] = eve[key].bind(eve);
  ylogChainProto[key] = eve[key].bind(eve);
});


// 短名字引用
var levels = ylogProto.levels,
  styles = ylogProto.styles,
  modifiers = ylogProto.modifiers,
  Tag = ylogProto.Tag;


function coerce(val)      {
  if (val instanceof Error) { return val.stack || val.message; }
  return val;
}
function noop()           {}
function realLen(str)     { return chalk.stripColor(str).length; }
function argsToStr(args)  { return ylogProto.format.apply(ylogProto, args); }
function write()          { ylogProto.output(argsToStr(arguments)); }
function writeln()        { ylogProto.output(argsToStr(arguments) + os.EOL); }
function md(str)          {
  return str.replace(ylogProto.markdownRegExp, function(raw, left, key, word) {
    var color = ylogProto.markdown[key];
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
    return chain([flag], {calledCount: 0}, this);
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


var lastEOL = true; // 记录是否需要输出换行符（第一次输出不需要换行）
/**
 * 函数形式的链式调用会执行此函数
 */
function call() {
  var flags = this.flags, options = this.options, ylog = this.ylog;

  var buffer = [], flag, level, label, labelLen, labelFill;

  var parsed = parseFlags(flags),
    FLAG = parsed.FLAG, lastFlag = parsed.lastFlag, attributes = parsed.attributes;

  var chainFn = chain(flags, options, ylog);


  // 如果最后一个 flag 是 modifier，则执行它的 call function
  if (lastFlag in modifiers && modifiers[lastFlag].call) {
    options[lastFlag] = options[lastFlag] || {};
    modifiers[lastFlag].call.apply(options[lastFlag], arguments);
  } else {

    // 等属性更新了再 return
    if (!ylog.enabled) { return chainFn; }

    // 获取要输出的 level 级别
    level = getCallLevel(FLAG.levels);

    //=> 用户指定了 level，但没有用户要的 level；或者指定的 level 就是 silent
    if (FLAG.levels.length && !level || level === 'silent') {
      return chainFn;
    }

    //=> 如果没有指定 level，或者用户指定的 level 大于当前 level 级别

    // label 是 [pid:]namespace:level 的一个组合； second 放最后
    label = '';
    labelLen = 0;
    labelFill = '';

    if (options.calledCount === 0) { // 第一次调用
      if (!lastEOL) { writeln(); }

      label = getLabel({
        pid: ylogProto.brush(process.pid, Tag.pid.color),
        ns: ylog.namespace,
        level: level && levels[level].tag
      });

      labelLen = realLen(label);
      labelFill = new Array(labelLen + 1).join(' ');

      if (attributes.tag === false) { label = labelFill; }
    }

    // 放到 options 中，方便 style 或 modifier 函数使用
    // 还是不要放了，label 只用 core.js 内部控制，外部不要控制
    //options.label = label;
    //options.labelLength = labelLen;

    if ((lastFlag in levels) || !FLAG.styles.length) {
      buffer.push(argsToStr(arguments));
    } else {
      flag = FLAG.styles.pop();
      buffer.push(styles[flag].apply(options, arguments));
    }

    var output = buffer.join(' '), tmp;


    FLAG.modifiers.forEach(function(modFlag) {
      tmp = modifiers[modFlag].post.apply(options, [output]);
      if (typeof tmp !== 'undefined') {
        output = tmp;
      }
    });

    // default use markdown
    if (attributes.md !== false) { output = md(output); }

    // 在同一行上做第 2+ 次输出，要在前面加个空格
    if (options.calledCount > 0) {
      output = ' ' + output;
    }

    // 如果 attributes 中有设置 no.ln 或 no.eol，则表示下次不要输出换行符了
    lastEOL = attributes.ln === false || attributes.eol === false;

    if (label && output) {
      var outputPad = ylog.prefixLabelEachLine ? label : labelFill;
      output = (label + output).replace(/\n(?=[^\n]+)/g, function(raw) {
        return raw + (raw.length ? outputPad : label);
      });
    }

    var eventKey = [
      chalk.stripColor(ylog.namespace) || '',
      level || ''
    ].join('.').replace(/^\.|\.$/g, '');

    // 加个前缀，因为如果没加，且 eventKey === 'error' 时，此处会报错
    eve.emit('sys.' + eventKey, output);

    write(output);

    options.calledCount++;
  }

  return chainFn;
}


/**
 * 分析 flags
 * @param {Array} flags
 * @returns {{FLAG: {levels: Array, modifiers: Array, styles: Array}, lastFlag: String, attributes: {}}}
 */
function parseFlags(flags) {
  var i, flag, noFlag;

  var FLAG = { levels: [], modifiers: [], styles: [] };
  var attributes = {}, lastFlag;

  for (i = 0; i < flags.length; i++) {
    flag = flags[i];
    if (flag === 'no') {
      noFlag = 'no' + flags[i + 1];
      if (noFlag in modifiers) {
        i++;
        flag = noFlag;
      } else { // 忽略这个 no 属性
        continue;
      }
    }

    /* jshint ignore:start */
    Object.keys(FLAG).forEach(function (key) {
      if (flag in ylogProto[key]) {
        FLAG[key].push(flag);

        if (key === 'modifiers') {
          if (flag.indexOf('no') === 0) {
            attributes[flag.substr(2)] = false;
          } else {
            attributes[flag] = true;
          }
        }

        lastFlag = flag; // 确保 lastFlag 一定存在
      }
    });
    /* jshint ignore:end */
  }

  return {FLAG: FLAG, lastFlag: lastFlag, attributes: attributes};
}


// 对 levels 排序的一个帮助函数
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
  var label = Object.keys(Tag)
    .filter(function(key) { return Tag[key].show && opts[key]; })
    .sort(function(k1, k2) { return Tag[k1].order - Tag[k2].order; })
    .map(function(key) {
      return getTagLabel(key, opts[key]);
    }).join(' ');

  if (label) {
    label = (Tag.ns.show && opts.ns ? '   ' : '') + label + ' ';
  }
  return label;
}

/**
 * 根据 tag 的类型及 tag string，得到应该输出的 label
 * @param {String} type - pid, ns, level 三选一
 * @param {String} tag  - 未处理前的 tag
 * @returns {String} - 输出处理后的 tag
 */
function getTagLabel(type, tag) {
  var cfg = Tag[type];
  var noColorTag = chalk.stripColor(tag);
  var i, fill = '', len = (cfg.len < 0 && cfg.max ? cfg.max : cfg.len) - noColorTag.length;
  if (len < 0) { return tag; }

  for (i = 0; i < len; i++) { fill += cfg.fill; }
  if (cfg.align === 'center') {
    var mid = Math.round(len / 2);
    return fill.substring(0, mid) + tag + fill.substr(mid);
  }
  return cfg.align === 'left' ? tag + fill : fill + tag;
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
 * 添加或修改 Modifier Flag
 *
 * @param {String} name - 修改器名称
 * @param {Function} [postFn] - 函数，其唯一的参数是当前要输出的内容
 * @param {Function} [callFn] - 函数，在此 modify 被用函数形式调用时，可能会传一些参数进来，用此 callFn 来处理这些参数
 *                              callFn 绑定在 ylog.options[flag] 对象上
 */
ylogProto.modifierFlag = function(name, postFn, callFn) {
  if (name.indexOf('no') === 0) {
    var nono = name.substr(2);
    if (!(nono in modifiers)) { ylogProto.modifierFlag(nono); }
  }

  // postFn不存在就用空函数，但 callFn 不存在在 call 内部需要利用
  modifiers[name] = {post: postFn || noop, call: callFn};
  appendFlag(name);
};

/**
 * 添加或修改 Style Flag
 *
 * @param {String} name - 样式名称
 * @param {Function} [fn] - 样式处理程序，fn 绑定在了 chalk 之上，所以你可以在 fn 中使用 this.red.bgGreen 等 chalk 方法
 */
ylogProto.styleFlag = function(name, fn) {
  styles[name] = fn || noop;
  appendFlag(name);
};

/**
 * 指定一个默认级别，也可以是一个数组
 * @param {String|Array} levelFlags
 */
ylogProto.setLevel = function(levelFlags) {
  [].concat(levelFlags).forEach(function(flag) {
    if (!(flag in levels)) {
      throw new Error('Level flag <' + flag + '> not exists.');
    }
  });
  ylogProto.level = levelFlags;
};

/**
 * level 模式
 *
 * - 如果是 `'weight'`，即只会输出 weight 值 >= 当前 level 级别的日志
 * - 如果是 `'only'`，只输出 ylog.level 中指定级别的日志
 *
 * @param {String} mode
 */
ylogProto.setLevelMode = function(mode) {
  ylogProto.levelMode = mode === 'only' ? 'only' : 'weight';
};


module.exports = makeYlog();
