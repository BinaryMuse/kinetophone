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
  this._activeEventsPerChannel = {};

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

  var tree = new IntervalTree(totalDuration / 2),
      events = channel.events || [];

  this._channels[name] = {
    name: name,
    events: events,
    tree: tree
  };
  this._activeEventsPerChannel[name] = [];

  events.forEach(function(evt) {
    this._addEventToTree(tree, evt);
  }.bind(this));
};

Kinetophone.prototype.addEvent = function(channelName, evt) {
  var tree = this._channels[channelName].tree;
  this._addEventToTree(tree, evt);
};

Kinetophone.prototype._addEventToTree = function(tree, evt) {
  var end;
  if (typeof evt.end === "undefined" && typeof evt.duration === "undefined") {
    end = evt.start + 1;
  } else if (typeof evt.end === "undefined") {
    end = evt.start + evt.duration;
  } else if (typeof evt.duration === "undefined") {
    end = evt.end;
  } else {
    throw new Error("Cannot specify both 'end' and 'duration'");
  }

  tree.add([evt.start, end, { start: evt.start, end: end, data: evt }]);
};

Kinetophone.prototype.setTotalDuration = function(duration) {
  if (totalDuration === null || typeof totalDuration === "undefined") {
    throw new Error("You must specify a total duration");
  }

  this._totalDuration = duration;

  Object.keys(this._channels).forEach(function(channelName) {
    var channel = this._channels[channelName];
    delete this._channels[channelName];

    this.addChannel({
      name: channel.name,
      events: channel.events
    });
  }.bind(this));
};

Kinetophone.prototype._timerCallback = function(time) {
  if (this._lastTimerCallback === null) {
    this.emit("timeupdate", time);
    this._lastTimerCallback = time;
    this._resolveEvents(0, time);
  } else if (time - this._lastTimerCallback >= this._tickResolution) {
    this.emit("timeupdate", time);
    this._resolveEvents(this._lastTimerCallback + 1, time);
    this._lastTimerCallback = time;
  }

  if (time > this._totalDuration) {
    this.pause();
    this._timer.set(0);
    this._lastTimerCallback = null;
    this._clearAllEvents();
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
    this._resolveEvents(newTime, newTime);
    this.emit("seek", newTime);
  }
};

Kinetophone.prototype._resolveEvents = function(lastTime, currentTime) {
  Object.keys(this._channels).forEach(function(chan) {
    this._resolveEventsForChannel(chan, lastTime, currentTime);
  }.bind(this));
};

Kinetophone.prototype._clearAllEvents = function() {
  Object.keys(this._channels).forEach(function(chan) {
    this._clearAllEventsForChannel(chan);
  }.bind(this));
};

Kinetophone.prototype._resolveEventsForChannel = function(channel, lastTime, currentTime) {
  var name = this._channels[channel].name;

  var eventsRef = this._activeEventsPerChannel[channel];

  var eventsToRemove = [];
  var eventsToAdd = lastTime === currentTime ?
      this._channels[channel].tree.search(currentTime) :
      this._channels[channel].tree.search(lastTime, currentTime);

  eventsRef.forEach(function(evt, i) {
    if (currentTime < evt.start || currentTime >= evt.end) {
      var toEmit = { name: name, start: evt.start, data: evt.data.data };
      if (typeof evt.data.data !== "undefined") toEmit.data = evt.data.data;
      if (typeof evt.data.end !== "undefined") toEmit.end = evt.data.end;
      if (typeof evt.data.duration !== "undefined") toEmit.duration = evt.data.duration;
      this.emit("exit", toEmit);
      this.emit("exit:" + name, toEmit);
      // High to low so indexes don't change when we remove them later
      eventsToRemove.unshift(i);
    }
  }.bind(this));

  eventsToRemove.forEach(function(idx) {
    eventsRef.splice(idx, 1);
  });

  eventsToAdd.forEach(function(evt) {
    evt = evt.data[2];
    if (currentTime >= evt.start && currentTime < evt.end && eventsRef.indexOf(evt) === -1) {
      var toEmit = { name: name, start: evt.data.start };
      if (typeof evt.data.data !== "undefined") toEmit.data = evt.data.data;
      if (typeof evt.data.end !== "undefined") toEmit.end = evt.data.end;
      if (typeof evt.data.duration !== "undefined") toEmit.duration = evt.data.duration;
      this.emit("enter", toEmit);
      this.emit("enter:" + name, toEmit);
      eventsRef.push(evt);
    }
  }.bind(this));
};

Kinetophone.prototype._clearAllEventsForChannel = function(channel) {
  this._activeEventsPerChannel[channel].forEach(function(evt) {
    var toEmit = { name: name, start: evt.start, data: evt.data.data };
    if (typeof evt.data.data !== "undefined") toEmit.data = evt.data.data;
    if (typeof evt.data.end !== "undefined") toEmit.end = evt.data.end;
    if (typeof evt.data.duration !== "undefined") toEmit.duration = evt.data.duration;
    this.emit("end", toEmit);
  }.bind(this));

  this._activeEventsPerChannel[channel] = [];
};

module.exports = Kinetophone;
