var EventEmitter = require("eventemitter3"),
    IntervalTree = require("interval-tree"),
    Timex = require("timex");

function Kinetophone(channels, totalDuration, options) {
  if (totalDuration === null || typeof totalDuration === "undefined") {
    throw new Error("You must specify a total duration");
  }

  EventEmitter.call(this);
  channels = channels || [];
  options = options || {};

  this._channels = {};
  this._activeTimingsPerChannel = {};

  channels.forEach(this.addChannel.bind(this));

  this._totalDuration = totalDuration;
  this._playing = false;
  this._timer = new Timex();
  this._timer.register(this._timerCallback.bind(this));
  this._lastTimerCallback = null;

  this._tickResolution = options.timeUpdateResolution || 33;
  if (options.tickImmediately) setTimeout(function() { this._timerCallback(0) }.bind(this));
}

Kinetophone.prototype = EventEmitter.prototype;

Kinetophone.prototype.addChannel = function(channel) {
  var name = channel.name;

  if (this._channels[name]) {
    throw new Error("Duplicate channel name '" + name + "'");
  }

  var tree = new IntervalTree(this._totalDuration / 2),
      timings = channel.timings || [];

  this._channels[name] = {
    name: name,
    timings: timings,
    tree: tree
  };
  this._activeTimingsPerChannel[name] = [];

  timings.forEach(function(timing) {
    this._addTimingToTree(tree, timing);
  }.bind(this));
};

Kinetophone.prototype.addTiming = function(channelName, timing) {
  var channel = this._channels[channelName];

  if (!channel) {
    throw new Error("No such channel '" + channelName + "'");
  }

  var tree = channel.tree;
  this._addTimingToTree(tree, timing);
};

Kinetophone.prototype._addTimingToTree = function(tree, timing) {
  var end;
  if (typeof timing.end === "undefined" && typeof timing.duration === "undefined") {
    end = timing.start + 1;
  } else if (typeof timing.end === "undefined") {
    end = timing.start + timing.duration;
  } else if (typeof timing.duration === "undefined") {
    end = timing.end;
  } else {
    throw new Error("Cannot specify both 'end' and 'duration'");
  }

  tree.add([timing.start, end, { start: timing.start, end: end, data: timing }]);
};

Kinetophone.prototype.setTotalDuration = function(duration) {
  if (duration === null || typeof duration === "undefined") {
    throw new Error("You must specify a total duration");
  }

  this._totalDuration = duration;

  Object.keys(this._channels).forEach(function(channelName) {
    var channel = this._channels[channelName];
    delete this._channels[channelName];

    this.addChannel({
      name: channel.name,
      timings: channel.timings
    });
  }.bind(this));
};

Kinetophone.prototype._timerCallback = function(time) {
  if (this._lastTimerCallback === null) {
    this.emit("timeupdate", time);
    this._lastTimerCallback = time;
    this._resolveTimings(0, time);
  } else if (time - this._lastTimerCallback >= this._tickResolution) {
    this.emit("timeupdate", time);
    this._resolveTimings(this._lastTimerCallback + 1, time);
    this._lastTimerCallback = time;
  }

  if (time > this._totalDuration) {
    this.pause();
    this._timer.set(0);
    this._lastTimerCallback = null;
    this._clearAllTimings();
    this.emit("end");
  }
};

Kinetophone.prototype.pause = function() {
  if (!this._playing) return;

  this._playing = false;
  this.emit("pause");
  this._timer.pause();
};

Kinetophone.prototype.play = function() {
  if (this._playing) return;

  this._playing = true;
  this.emit("play");
  this._timer.start();
};

Kinetophone.prototype.playing = function() {
  return this._playing;
};

Kinetophone.prototype.currentTime = function(newTime) {
  if (newTime === undefined) {
    return this._timer.currentTime;
  } else {
    this._lastTimerCallback = newTime;
    if (newTime < 0) newTime = 0;
    if (newTime > this._totalDuration) newTime = this._totalDuration;
    this.emit("seeking", newTime);
    this._timer.set(newTime);
    this.emit("timeupdate", newTime);
    this._resolveTimings(newTime, newTime);
    this.emit("seek", newTime);
  }
};

Kinetophone.prototype._resolveTimings = function(lastTime, currentTime) {
  Object.keys(this._channels).forEach(function(chan) {
    this._resolveTimingsForChannel(chan, lastTime, currentTime);
  }.bind(this));
};

Kinetophone.prototype._clearAllTimings = function() {
  Object.keys(this._channels).forEach(function(chan) {
    this._clearAllTimingsForChannel(chan);
  }.bind(this));
};

Kinetophone.prototype._resolveTimingsForChannel = function(channel, lastTime, currentTime) {
  var name = this._channels[channel].name;

  var timingsRef = this._activeTimingsPerChannel[channel];

  var timingsToRemove = [];
  var timingsToAdd = lastTime === currentTime ?
      this._channels[channel].tree.search(currentTime) :
      this._channels[channel].tree.search(lastTime, currentTime);

  timingsRef.forEach(function(timing, i) {
    if (currentTime < timing.start || currentTime >= timing.end) {
      var toEmit = { name: name, start: timing.start, data: timing.data.data };
      if (typeof timing.data.data !== "undefined") toEmit.data = timing.data.data;
      if (typeof timing.data.end !== "undefined") toEmit.end = timing.data.end;
      if (typeof timing.data.duration !== "undefined") toEmit.duration = timing.data.duration;
      this.emit("exit", toEmit);
      this.emit("exit:" + name, toEmit);
      // High to low so indexes don't change when we remove them later
      timingsToRemove.unshift(i);
    }
  }.bind(this));

  timingsToRemove.forEach(function(idx) {
    timingsRef.splice(idx, 1);
  });

  timingsToAdd.forEach(function(timing) {
    timing = timing.data[2];
    if (currentTime >= timing.start && currentTime < timing.end && timingsRef.indexOf(timing) === -1) {
      var toEmit = { name: name, start: timing.data.start };
      if (typeof timing.data.data !== "undefined") toEmit.data = timing.data.data;
      if (typeof timing.data.end !== "undefined") toEmit.end = timing.data.end;
      if (typeof timing.data.duration !== "undefined") toEmit.duration = timing.data.duration;
      this.emit("enter", toEmit);
      this.emit("enter:" + name, toEmit);
      timingsRef.push(timing);
    }
  }.bind(this));
};

Kinetophone.prototype._clearAllTimingsForChannel = function(channel) {
  this._activeTimingsPerChannel[channel].forEach(function(timing) {
    var toEmit = { name: name, start: timing.start, data: timing.data.data };
    if (typeof timing.data.data !== "undefined") toEmit.data = timing.data.data;
    if (typeof timing.data.end !== "undefined") toEmit.end = timing.data.end;
    if (typeof timing.data.duration !== "undefined") toEmit.duration = timing.data.duration;
    this.emit("end", toEmit);
  }.bind(this));

  this._activeTimingsPerChannel[channel] = [];
};

module.exports = Kinetophone;
