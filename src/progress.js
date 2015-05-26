/*
 * ylog
 * https://github.com/qiu8310/ylog
 *
 * Copyright (c) 2015 Zhonglei Qiu
 * Licensed under the MIT license.
 */

var Gauge = require('gauge'),
  TrackerGroup = require('are-we-there-yet').TrackerGroup;

/**
 * 利用 Gauge 创建一个进度条
 *
 * @param {String} name - 进度条名称
 * @param {Object} opts - 主要是 [Gauge 的配置](https://github.com/iarna/gauge#var-gauge--new-gaugeoptions-ansistream)
 * @param {String} opts.theme - Gauge 主题，有 `unicode` 和 `ascii` 两类
 * @param {Object} opts.stream - Gauge 的输出流，默认是 process.stderr
 * @constructor
 */
function Progress(name, opts) {
  opts = opts || {};

  var self = this;

  // 设置 Gauge 主题
  var theme = opts.theme;
  opts.theme = theme in Gauge ? Gauge[theme] : null;

  this.name = name;
  this.lastJobName = name;

  this.tracker = new TrackerGroup(name);
  this.gauge = new Gauge(opts, opts.stream);

  self.tracker.on('change', function(name) {
    var completed = self.completed();
    self.lastJobName = name;
    self.gauge.show(name, completed);

    if (completed >= 1) {
      self.tracker.emit('finished', self.name);
    }
  });
}

Progress.prototype = {

  /**
   * 输出当前完成的进度
   * @returns {Number}
   */
  completed: function() {
    return this.tracker.completed();
  },

  /**
   * 添加一项任务
   * @param {String} name
   * @param {Number} totalValue
   * @param {Number} [weight] - 当前任务所占的权重，默认是 1，即每个任务权重都一样
   * @param {Boolean} [isStream] - 是否是一个 Stream Job，如果是的话返回的也是一个可以 pipe 的流
   * @returns {*}
   */
  addJob: function(name, totalValue, weight, isStream) {
    var job;

    if (typeof weight === 'boolean') {
      isStream = weight;
      weight = 1;
    }

    if (isStream) {
      job = this.tracker.newStream(name, totalValue, weight);
    } else {
      job = this.tracker.newItem(name, totalValue, weight);
    }
    job.complete = job.completeWork;
    return job;
  },

  /**
   * 将当前的进度条设置成 100%
   * @returns {Progress}
   */
  finish: function() {
    this.tracker.finish();
    return this;
  },

  /**
   * 隐藏进度条
   * @returns {Progress}
   */
  hide: function() {
    this.gauge.hide();
    return this;
  },

  /**
   * 显示进度条
   * @returns {Progress}
   */
  show: function() {
    this.gauge.show(this.lastJobName, this.completed());
    return this;
  },

  /**
   * 禁用
   * @returns {Progress}
   */
  disable: function() {
    this.gauge.disable();
    return this;
  },

  /**
   * 启用
   * @returns {Progress}
   */
  enable: function() {
    this.gauge.enable();
    return this;
  },

  /**
   * 事件监听
   * @returns {Progress}
   */
  on: function() {
    this.tracker.on.apply(this.tracker, arguments);
    return this;
  }
};


module.exports = Progress;
