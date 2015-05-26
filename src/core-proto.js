var chalk = require('chalk'),
  util = require('util'),
  os = require('os');

var h = require('./helper');

function coerce(val)      {
  if (val instanceof Error) { return val.stack ? val.stack + os.EOL : val.message; }
  return val;
}

var proto = {

  // 传入用户可能需要用到的库
  chalk: chalk,


  levels: {},     // 所有的用 ylog.levelFlag 定义的 level 都保存在这
  styles: {},     // 所有的用 ylog.styleFlag 定义的 style 都保存在这


  // 全局配置的属性
  attributes: {
    md: true,     // 是否使用类 markdown 语法
    pad: 0,       // 每输出一行前的 padChar 字符个数
    padChar: ' ',
    nsPad: 3,     // 在输出 namespace 之前，输出 nsPad 个 nsPadChar 字符在最左侧
    nsPadChar: ' ',
    color: true,  // 是否启用颜色
    tag: true,    // 是否显示左侧 pid, ns, level 这个标签
    eol: 1,       // 每行末尾换行符个数
    prefix: false,// 在某一次输出中，可以会包含多行，你是否需要在每行的前面都输出 pid/ns/level 这些 label 呢？
    label: false, // 用户自定义的 label
    time: false,  // 是否显示两次之间的执行时间
    wrap: true   // 控制每行输出的字符个数，如果要限制，可以指定具体数字或百分比
  },

  attributeTransforms: {
    md: Boolean,
    pad: Number,
    padChar: String,
    nsPad: Number,
    nsPadChar: String,
    //color: function(val) {}, // 不做转化
    tag: Boolean,
    eol: Number,
    label: function() { return [].slice.call(arguments); },
    time: Boolean,
    prefix: Boolean
    //wrap: function(val) {}
  },

  timeLevelColors: [[40, 'gray'], [65, 'yellow'], [Infinity, 'red']],


  /**
   * 计算 wrap 的长度
   */
  computeWrap: function(wrap, text, prefixLength) {
    if (wrap === true) {
      wrap = h.ttyWidths() - 1 - prefixLength;
    } else if (/(\.\d+|%)$/.test(wrap)) {
      wrap = parseFloat(wrap);
      if (wrap > 1) {
        wrap = wrap / 100;
      }
      wrap = Math.round(h.ttyWidths() * wrap);
    }

    return wrap > 0 ? h.wraptext(wrap, text) : text;
  },

  // 在某一次输出中，可以会包含多行，你是否需要在每行的前面都输出 pid/ns/level 这些 label 呢？
  // 使用 prefixLabel 设置此参数
  // prefixLabelEachLine: false, 转移到 attributes 中的 prefix


  // 输出日志是显示在日志最左边的 process id, namespace 和 level
  // 可以定义它们显示的长度，对齐方式，及是否显示，还有显示顺序等
  Tag: {
    pid:  {len:  5, align: 'right', fill: ' ', order: 10, show: false, color: 'gray' }, // color 只对 pid 有效
    ns:   {len:  0, align: 'left',  fill: ' ', order: 20, show: true  },
    level:{len: -1, align: 'center',fill: ' ', order: 30, show: true, max: 3} // 如果 len < 0，则会使用 max 属性当 len
  },


  /**
   * 指定当前的日志级别，如果没有指定，则输出所有级别的日志
   * 同时可以指定成数组（主要是 levelMode = 'only' 时非常有用）
   * 请使用 ylog.setLevel 设置此参数（无法直接在 ylog 中直接修改此值）
   * @type {String|Array}
   */
  level: null,

  // only 和 weight 两种形式：
  // only 表示只显示 level 所指定的日志级别；而 weight 表示显示大于等于 level 的级别的所有日志
  // 请使用 ylog.setLevelMode 设置此参数
  levelMode: 'weight',

  /**
   * 定义 markdown 替换的规制
   *
   *  - 样式支持同时写多个，比如 "bold.gray"，则加粗的同时还会使字体变灰
   *  - 如果你不想要这个样式，只要将它设置成 false 即可
   *  - 不能添加新的标签
   *
   * @example
   *
   *  如果出现 "are **you** ok"，则 you 会使用 markdowns.** 中所指定的样式
   */
  markdowns: {
    '**': 'bold',
    '*': 'gray',
    '`': 'red.bgWhite',
    '__': 'underline',
    '_': 'italic',
    '!': 'yellow',
    '@': 'blue',
    '&': 'green'
  },

  // 配合 markdown 用的
  markdownRegExp: /(\s|^)(\*\*|__|\*|_|!|@|&|`)([^\*_\s]|[^\*_\s][\s\S]*?[^\*_\s])\2(?=[\s,.!?]|$)/g,


  inspect: function(v, colors, depth) {
    return util.inspect(v, {colors: colors, depth: depth || 2}).replace(/\s*\n\s*/g, ' ');
  },

  // 给 ylog.format 用的
  formats: {
    o: function(v) { return proto.inspect(v, false); },
    j: function(v) { return JSON.stringify(v); },
    d: function(v) { return parseInt(v, 10); },
    f: function(v) { return parseFloat(v); },
    s: function(v) { return String(v); }
  },

  /**
   * 类似于 util.format
   *
   * 字符串都不带颜色，其它非字符串都使用 util.inspect 自带的颜色
   */
  format: function() {
    var tpl, args = [];

    if (!arguments.length) { return ''; }

    // don't slice `arguments`, it prevents v8 optimizations
    for (var i = 0; i < arguments.length; i++) { args[i] = coerce(arguments[i]); }

    if (typeof args[0] === 'string') {
      tpl = args.shift();
      tpl = tpl.replace(/%([a-z%])/g, function(raw, key) {
        if (key === '%') { return '%'; }
        if (key in proto.formats) {
          return proto.formats[key](args.shift());
        }
        return raw;
      });
      args.unshift(tpl);
    }

    return args.map(function(arg) {
      return (typeof arg !== 'string') ? proto.inspect(arg, true) : arg;
    }).join(' ');
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

  /**
   * 得到一个进度条
   *
   * 使用懒加载（require），使你在如果不需要进度条的情况下就不会去加载那些进度条相关的库
   *
   * @param {String} name
   * @param {Object} [opts]
   * @returns {*}
   */
  progress: function(name, opts) {
    var P = require('./progress');
    return new P(name, opts);
  },

  // 所有的输出都是走此函数
  output: function(str) { process.stdout.write(str); }
};


/**
 * 指定一个默认级别，也可以是一个数组
 * @param {String|Array} levelFlags
 * @param {String} levelMode
 */
proto.setLevel = function(levelFlags, levelMode) {
  [].concat(levelFlags).forEach(function(flag) {
    if (!(flag in proto.levels)) {
      throw new Error('Level flag <' + flag + '> not exists.');
    }
  });
  proto.level = levelFlags;

  if (levelMode) {
    proto.setLevelMode(levelMode);
  }
};


/**
 * level 模式
 *
 * - 如果是 `'weight'`，即只会输出 weight 值 >= 当前 level 级别的日志
 * - 如果是 `'only'`，只输出 ylog.level 中指定级别的日志
 *
 * @param {String} mode
 */
proto.setLevelMode = function(mode) {
  proto.levelMode = mode === 'only' ? 'only' : 'weight';
};


module.exports = proto;
