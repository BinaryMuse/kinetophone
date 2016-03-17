(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["Kinetophone"] = factory();
	else
		root["Kinetophone"] = factory();
})(this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	var EventEmitter = __webpack_require__(1),
	    IntervalTree = __webpack_require__(2),
	    Timex = __webpack_require__(4);

	module.exports = (function() {
	  function Kinetophone(channels, totalDuration, options) {
	    if (totalDuration === null || typeof totalDuration === "undefined") {
	      throw new Error("You must specify a total duration");
	    }

	    EventEmitter.call(this);
	    channels = channels || [];
	    options = options || {};

	    this._channels = {};
	    this._activeTimingsPerChannel = {};
	    this._totalDuration = totalDuration;

	    channels.forEach(this.addChannel.bind(this));

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

	  Kinetophone.prototype.totalDuration = function(duration) {
	    if (typeof duration === "undefined") {
	      return this._totalDuration;
	    } else if (duration === null) {
	      throw new Error("You must specify a non-null total duration");
	    } else {
	      this._totalDuration = duration;

	      Object.keys(this._channels).forEach(function(channelName) {
	        var channel = this._channels[channelName];
	        delete this._channels[channelName];

	        this.addChannel({
	          name: channel.name,
	          timings: channel.timings
	        });
	      }.bind(this));
	    }
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

	    if (this._timer.currentTime >= this._totalDuration) {
	      this._timer.set(0);
	      this._lastTimerCallback = null;
	      this._clearAllTimings();
	    }

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

	  Kinetophone.prototype.playbackRate = function(rate) {
	    if (rate === undefined) {
	      return this._timer.getRate();
	    } else {
	      this._timer.setRate(rate);
	      this.emit("rateupdate", rate);
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
	    var timingsRef = this._activeTimingsPerChannel[channel];

	    var timingsToRemove = [];
	    var timingsToAdd = lastTime === currentTime ?
	        this._channels[channel].tree.search(currentTime) :
	        this._channels[channel].tree.search(lastTime, currentTime);

	    timingsRef.forEach(function(timing, i) {
	      if (currentTime < timing.start || currentTime >= timing.end) {
	        var toEmit = { name: channel, start: timing.start, data: timing.data.data };
	        if (typeof timing.data.data !== "undefined") toEmit.data = timing.data.data;
	        if (typeof timing.data.end !== "undefined") toEmit.end = timing.data.end;
	        if (typeof timing.data.duration !== "undefined") toEmit.duration = timing.data.duration;
	        this.emit("exit", toEmit);
	        this.emit("exit:" + channel, toEmit);
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
	        var toEmit = timingFromRawData(channel, timing);
	        this.emit("enter", toEmit);
	        this.emit("enter:" + channel, toEmit);
	        timingsRef.push(timing);
	      }
	    }.bind(this));
	  };

	  Kinetophone.prototype._clearAllTimingsForChannel = function(channel) {
	    this._activeTimingsPerChannel[channel].forEach(function(timing) {
	      var toEmit = timingFromRawData(channel, timing);
	      this.emit("exit", toEmit);
	      this.emit("exit:" + channel, toEmit);
	    }.bind(this));

	    this._activeTimingsPerChannel[channel] = [];
	  };

	  Kinetophone.prototype.getTimingsAt = function(time, channels) {
	    var search = function(tree) { return tree.search(time); },
	        filter = function(rawTiming) {
	          rawTiming = rawTiming.data[2];
	          return time >= rawTiming.start && time < rawTiming.end;
	        };
	    return this._findTimings(channels, filter, search);
	  };

	  Kinetophone.prototype.getTimingsBetween = function(start, end, channels) {
	    var search = function(tree) { return tree.search(start, end); },
	        filter = function(rawTiming) {
	          rawTiming = rawTiming.data[2];
	          return end !== rawTiming.end; // non-inclusive
	        };
	    return this._findTimings(channels, filter, search);
	  };

	  Kinetophone.prototype._findTimings = function(channels, filterFn, treeSearchFn) {
	    channels = channels || Object.keys(this._channels);
	    if (typeof channels === "string") channels = [channels];

	    return channels.map(function(channel) {
	      return {
	        name: channel,
	        timings: treeSearchFn(this._channels[channel].tree).filter(filterFn).map(function(rawTiming) {
	          return timingFromRawData(channel, rawTiming.data[2]);
	        })
	      };
	    }.bind(this)).reduce(function(acc, current) {
	      acc[current.name] = current.timings;
	      return acc;
	    }, {});
	  };

	  function timingFromRawData(channel, timing) {
	    var result = { name: channel, start: timing.data.start };
	    if (typeof timing.data.data !== "undefined") result.data = timing.data.data;
	    if (typeof timing.data.end !== "undefined") result.end = timing.data.end;
	    if (typeof timing.data.duration !== "undefined") result.duration = timing.data.duration;
	    return result;
	  }

	  return Kinetophone;
	}());


/***/ },
/* 1 */
/***/ function(module, exports) {

	'use strict';

	/**
	 * Representation of a single EventEmitter function.
	 *
	 * @param {Function} fn Event handler to be called.
	 * @param {Mixed} context Context for function execution.
	 * @param {Boolean} once Only emit once
	 * @api private
	 */
	function EE(fn, context, once) {
	  this.fn = fn;
	  this.context = context;
	  this.once = once || false;
	}

	/**
	 * Minimal EventEmitter interface that is molded against the Node.js
	 * EventEmitter interface.
	 *
	 * @constructor
	 * @api public
	 */
	function EventEmitter() { /* Nothing to set */ }

	/**
	 * Holds the assigned EventEmitters by name.
	 *
	 * @type {Object}
	 * @private
	 */
	EventEmitter.prototype._events = undefined;

	/**
	 * Return a list of assigned event listeners.
	 *
	 * @param {String} event The events that should be listed.
	 * @returns {Array}
	 * @api public
	 */
	EventEmitter.prototype.listeners = function listeners(event) {
	  if (!this._events || !this._events[event]) return [];
	  if (this._events[event].fn) return [this._events[event].fn];

	  for (var i = 0, l = this._events[event].length, ee = new Array(l); i < l; i++) {
	    ee[i] = this._events[event][i].fn;
	  }

	  return ee;
	};

	/**
	 * Emit an event to all registered event listeners.
	 *
	 * @param {String} event The name of the event.
	 * @returns {Boolean} Indication if we've emitted an event.
	 * @api public
	 */
	EventEmitter.prototype.emit = function emit(event, a1, a2, a3, a4, a5) {
	  if (!this._events || !this._events[event]) return false;

	  var listeners = this._events[event]
	    , len = arguments.length
	    , args
	    , i;

	  if ('function' === typeof listeners.fn) {
	    if (listeners.once) this.removeListener(event, listeners.fn, true);

	    switch (len) {
	      case 1: return listeners.fn.call(listeners.context), true;
	      case 2: return listeners.fn.call(listeners.context, a1), true;
	      case 3: return listeners.fn.call(listeners.context, a1, a2), true;
	      case 4: return listeners.fn.call(listeners.context, a1, a2, a3), true;
	      case 5: return listeners.fn.call(listeners.context, a1, a2, a3, a4), true;
	      case 6: return listeners.fn.call(listeners.context, a1, a2, a3, a4, a5), true;
	    }

	    for (i = 1, args = new Array(len -1); i < len; i++) {
	      args[i - 1] = arguments[i];
	    }

	    listeners.fn.apply(listeners.context, args);
	  } else {
	    var length = listeners.length
	      , j;

	    for (i = 0; i < length; i++) {
	      if (listeners[i].once) this.removeListener(event, listeners[i].fn, true);

	      switch (len) {
	        case 1: listeners[i].fn.call(listeners[i].context); break;
	        case 2: listeners[i].fn.call(listeners[i].context, a1); break;
	        case 3: listeners[i].fn.call(listeners[i].context, a1, a2); break;
	        default:
	          if (!args) for (j = 1, args = new Array(len -1); j < len; j++) {
	            args[j - 1] = arguments[j];
	          }

	          listeners[i].fn.apply(listeners[i].context, args);
	      }
	    }
	  }

	  return true;
	};

	/**
	 * Register a new EventListener for the given event.
	 *
	 * @param {String} event Name of the event.
	 * @param {Functon} fn Callback function.
	 * @param {Mixed} context The context of the function.
	 * @api public
	 */
	EventEmitter.prototype.on = function on(event, fn, context) {
	  var listener = new EE(fn, context || this);

	  if (!this._events) this._events = {};
	  if (!this._events[event]) this._events[event] = listener;
	  else {
	    if (!this._events[event].fn) this._events[event].push(listener);
	    else this._events[event] = [
	      this._events[event], listener
	    ];
	  }

	  return this;
	};

	/**
	 * Add an EventListener that's only called once.
	 *
	 * @param {String} event Name of the event.
	 * @param {Function} fn Callback function.
	 * @param {Mixed} context The context of the function.
	 * @api public
	 */
	EventEmitter.prototype.once = function once(event, fn, context) {
	  var listener = new EE(fn, context || this, true);

	  if (!this._events) this._events = {};
	  if (!this._events[event]) this._events[event] = listener;
	  else {
	    if (!this._events[event].fn) this._events[event].push(listener);
	    else this._events[event] = [
	      this._events[event], listener
	    ];
	  }

	  return this;
	};

	/**
	 * Remove event listeners.
	 *
	 * @param {String} event The event we want to remove.
	 * @param {Function} fn The listener that we need to find.
	 * @param {Boolean} once Only remove once listeners.
	 * @api public
	 */
	EventEmitter.prototype.removeListener = function removeListener(event, fn, once) {
	  if (!this._events || !this._events[event]) return this;

	  var listeners = this._events[event]
	    , events = [];

	  if (fn) {
	    if (listeners.fn && (listeners.fn !== fn || (once && !listeners.once))) {
	      events.push(listeners);
	    }
	    if (!listeners.fn) for (var i = 0, length = listeners.length; i < length; i++) {
	      if (listeners[i].fn !== fn || (once && !listeners[i].once)) {
	        events.push(listeners[i]);
	      }
	    }
	  }

	  //
	  // Reset the array, or remove it completely if we have no more listeners.
	  //
	  if (events.length) {
	    this._events[event] = events.length === 1 ? events[0] : events;
	  } else {
	    delete this._events[event];
	  }

	  return this;
	};

	/**
	 * Remove all listeners or only the listeners for the specified event.
	 *
	 * @param {String} event The event want to remove all listeners for.
	 * @api public
	 */
	EventEmitter.prototype.removeAllListeners = function removeAllListeners(event) {
	  if (!this._events) return this;

	  if (event) delete this._events[event];
	  else this._events = {};

	  return this;
	};

	//
	// Alias methods names because people roll like that.
	//
	EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
	EventEmitter.prototype.addListener = EventEmitter.prototype.on;

	//
	// This function doesn't apply anymore.
	//
	EventEmitter.prototype.setMaxListeners = function setMaxListeners() {
	  return this;
	};

	//
	// Expose the module.
	//
	EventEmitter.EventEmitter = EventEmitter;
	EventEmitter.EventEmitter2 = EventEmitter;
	EventEmitter.EventEmitter3 = EventEmitter;

	//
	// Expose the module.
	//
	module.exports = EventEmitter;


/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	var SortedList = __webpack_require__(3);

	/**
	 * IntervalTree
	 *
	 * @param (object) data:
	 * @param (number) center:
	 * @param (object) options:
	 *   center:
	 *
	 **/
	function IntervalTree(center, options) {
	  options || (options = {});

	  this.startKey     = options.startKey || 0; // start key
	  this.endKey       = options.endKey   || 1; // end key
	  this.intervalHash = {};                    // id => interval object
	  this.pointTree = new SortedList({          // b-tree of start, end points 
	    compare: function(a, b) {
	      if (a == null) return -1;
	      if (b == null) return  1;
	      var c = a[0]- b[0];
	      return (c > 0) ? 1 : (c == 0)  ? 0 : -1;
	    }
	  });

	  this._autoIncrement = 0;

	  // index of the root node
	  if (!center || typeof center != 'number') {
	    throw new Error('you must specify center index as the 2nd argument.');
	  }

	  this.root = new Node(center, this);
	}


	/**
	 * publid methods
	 **/


	/**
	 * add new range
	 **/
	IntervalTree.prototype.add = function(data, id) {
	  if (this.intervalHash[id]) {
	    throw new Error('id ' + id + ' is already registered.');
	  }

	  if (id == undefined) {
	    while (this.intervalHash[this._autoIncrement]) {
	      this._autoIncrement++;
	    }
	    id = this._autoIncrement;
	  }

	  var itvl = new Interval(data, id, this.startKey, this.endKey);
	  this.pointTree.insert([itvl.start, id]);
	  this.pointTree.insert([itvl.end,   id]);
	  this.intervalHash[id] = itvl;
	  this._autoIncrement++;
	  _insert.call(this, this.root, itvl);
	};


	/**
	 * search
	 *
	 * @param (integer) val:
	 * @return (array)
	 **/
	IntervalTree.prototype.search = function(val1, val2) {
	  var ret = [];
	  if (typeof val1 != 'number') {
	    throw new Error(val1 + ': invalid input');
	  }

	  if (val2 == undefined) {
	    _pointSearch.call(this, this.root, val1, ret);
	  }
	  else if (typeof val2 == 'number') {
	    _rangeSearch.call(this, val1, val2, ret);
	  }
	  else {
	    throw new Error(val1 + ',' + val2 + ': invalid input');
	  }
	  return ret;
	};


	/**
	 * remove: 
	 **/
	IntervalTree.prototype.remove = function(interval_id) {
	};



	/**
	 * private methods
	 **/


	/**
	 * _insert
	 **/
	function _insert(node, itvl) {
	  if (itvl.end < node.idx) {
	    if (!node.left) {
	      node.left = new Node(itvl.start + itvl.end >> 1, this);
	    }
	    return _insert.call(this, node.left, itvl);
	  }

	  if (node.idx < itvl.start) {
	    if (!node.right) {
	      node.right = new Node(itvl.start + itvl.end >> 1, this);
	    }
	    return _insert.call(this, node.right, itvl);
	  }
	  return node.insert(itvl);
	}


	/**
	 * _pointSearch
	 * @param (Node) node
	 * @param (integer) idx 
	 * @param (Array) arr
	 **/
	function _pointSearch(node, idx, arr) {
	  if (!node) return;

	  if (idx < node.idx) {
	    node.starts.every(function(itvl) {
	      var bool = (itvl.start <= idx);
	      if (bool) arr.push(itvl.result());
	      return bool;
	    });
	    return _pointSearch.call(this, node.left, idx, arr);
	  }

	  else if (idx > node.idx) {
	    node.ends.every(function(itvl) {
	      var bool = (itvl.end >= idx);
	      if (bool) arr.push(itvl.result());
	      return bool;
	    });
	    return _pointSearch.call(this, node.right, idx, arr);
	  }
	  // exact equal
	  else {
	    node.starts.map(function(itvl) { arr.push(itvl.result()) });
	  }
	}



	/**
	 * _rangeSearch
	 * @param (integer) start
	 * @param (integer) end
	 * @param (Array) arr
	 **/
	function _rangeSearch(start, end, arr) {
	  if (end - start <= 0) {
	    throw new Error('end must be greater than start. start: ' + start + ', end: ' + end);
	  }
	  var resultHash = {};

	  var wholeWraps = [];
	  _pointSearch.call(this, this.root, (start + end) >> 1, wholeWraps, true);

	  wholeWraps.forEach(function(result) {
	    resultHash[result.id] = true;
	  });


	  var idx1 = this.pointTree.bsearch([start, null]);
	  var pointTreeArray = this.pointTree;
	  while (idx1 >= 0 && pointTreeArray[idx1][0] == start) {
	    idx1--;
	  }

	  var idx2 = this.pointTree.bsearch([end,   null]);
	  if (idx2 >= 0)
	  {
	    var len = pointTreeArray.length -1;
	    while (idx2 <= len && pointTreeArray[idx2][0] <= end) {
	      idx2++;
	    }

	    pointTreeArray.slice(idx1 + 1, idx2).forEach(function(point) {
	      var id = point[1];
	      resultHash[id] = true;
	    }, this);

	    Object.keys(resultHash).forEach(function(id) {
	      var itvl = this.intervalHash[id];
	      arr.push(itvl.result(start, end));
	    }, this);
	  }
	}



	/**
	 * subclasses
	 * 
	 **/


	/**
	 * Node : prototype of each node in a interval tree
	 * 
	 **/
	function Node(idx) {
	  this.idx = idx;
	  this.starts = new SortedList({
	    compare: function(a, b) {
	      if (a == null) return -1;
	      if (b == null) return  1;
	      var c = a.start - b.start;
	      return (c > 0) ? 1 : (c == 0)  ? 0 : -1;
	    }
	  });

	  this.ends = new SortedList({
	    compare: function(a, b) {
	      if (a == null) return -1;
	      if (b == null) return  1;
	      var c = a.end - b.end;
	      return (c < 0) ? 1 : (c == 0)  ? 0 : -1;
	    }
	  });
	};

	/**
	 * insert an Interval object to this node
	 **/
	Node.prototype.insert = function(interval) {
	  this.starts.insert(interval);
	  this.ends.insert(interval);
	};



	/**
	 * Interval : prototype of interval info
	 **/
	function Interval(data, id, s, e) {
	  this.id     = id;
	  this.start  = data[s];
	  this.end    = data[e];
	  this.data   = data;

	  if (typeof this.start != 'number' || typeof this.end != 'number') {
	    throw new Error('start, end must be number. start: ' + this.start + ', end: ' + this.end);
	  }

	  if ( this.start >= this.end) {
	    throw new Error('start must be smaller than end. start: ' + this.start + ', end: ' + this.end);
	  }
	}

	/**
	 * get result object
	 **/
	Interval.prototype.result = function(start, end) {
	  var ret = {
	    id   : this.id,
	    data : this.data
	  };
	  if (typeof start == 'number' && typeof end == 'number') {
	    /**
	     * calc overlapping rate
	     **/
	    var left  = Math.max(this.start, start);
	    var right = Math.min(this.end,   end);
	    var lapLn = right - left;
	    ret.rate1 = lapLn / (end - start);
	    ret.rate2 = lapLn / (this.end - this.start);
	  }
	  return ret;
	};

	module.exports = IntervalTree;


/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_FACTORY__, __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/*package.json
	{
	  "volo": {
	    "dependencies": {
	      "sortedlist": "github:shinout/SortedList"
	    }
	  }
	}
	*/
	(function(root,factory) {
	  if (true) !(__WEBPACK_AMD_DEFINE_ARRAY__ = [], __WEBPACK_AMD_DEFINE_FACTORY__ = (factory), __WEBPACK_AMD_DEFINE_RESULT__ = (typeof __WEBPACK_AMD_DEFINE_FACTORY__ === 'function' ? (__WEBPACK_AMD_DEFINE_FACTORY__.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__)) : __WEBPACK_AMD_DEFINE_FACTORY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	  else if (typeof module == 'object' && module.exports) module.exports = factory();
	  else root.SortedList = factory();
	}(this, function () {

	  /**
	   * SortedList : constructor
	   */
	  var SortedList = function SortedList() {
	    var arr     = null,
	        options = {},
	        args    = arguments;

	    ["0","1"].forEach(function(n) {
	      var val = args[n];
	      if (Array.isArray(val)) {
	        arr = val;
	      }
	      else if (val && typeof val == "object") {
	        options = val;
	      }
	    });

	    if (typeof options.filter == 'function') {
	      this._filter = options.filter;
	    }

	    if (typeof options.compare == 'function') {
	      this._compare = options.compare;
	    }
	    else if (typeof options.compare == 'string' && SortedList.compares[options.compare]) {
	      this._compare = SortedList.compares[options.compare];
	    }

	    this._unique = !!options.unique;

	    if (options.resume && arr) {
	      arr.forEach(function(v, i) { this.push(v) }, this);
	    }
	    else if (arr) this.insert.apply(this, arr);
	  };

	  /**
	   * SortedList.create(val1, val2)
	   * creates an instance
	   **/
	  SortedList.create = function(val1, val2) {
	    return new SortedList(val1, val2);
	  };


	  SortedList.prototype = new Array();
	  SortedList.prototype.constructor = Array.prototype.constructor;

	  /**
	   * sorted.insertOne(val)
	   * insert one value
	   * returns false if failed, inserted position if succeed
	   **/
	  SortedList.prototype.insertOne = function(val) {
	    var pos = this.bsearch(val);
	    if (this._unique && this.key(val, pos) != null) return false;
	    if (!this._filter(val, pos)) return false;
	    this.splice(pos+1, 0, val);
	    return pos+1;
	  };

	  /**
	   * sorted.insert(val1, val2, ...)
	   * insert multi values
	   * returns the list of the results of insertOne()
	   **/
	  SortedList.prototype.insert = function() {
	    return Array.prototype.map.call(arguments, function(val) {
	      return this.insertOne(val);
	    }, this);
	  };

	  /**
	   * sorted.remove(pos)
	   * remove the value in the given position
	   **/
	  SortedList.prototype.remove = function(pos) {
	    this.splice(pos, 1);
	    return this;
	  }

	  /**
	   * sorted.bsearch(val)
	   * @returns position of the value
	   **/
	  SortedList.prototype.bsearch = function(val) {
	    if (!this.length) return -1;
	    var mpos,
	        spos = 0,
	        epos = this.length;
	    while (epos - spos > 1) {
	      mpos = Math.floor((spos + epos)/2);
	      mval = this[mpos];
	      var comp = this._compare(val, mval);
	      if (comp == 0) return mpos;
	      if (comp > 0)  spos = mpos;
	      else           epos = mpos;
	    }
	    return (spos == 0 && this._compare(this[0], val) > 0) ? -1 : spos;
	  };

	  /**
	   * sorted.key(val)
	   * @returns first index if exists, null if not
	   **/
	  SortedList.prototype.key = function(val, bsResult) {
	    if (bsResult== null) bsResult = this.bsearch(val);
	    var pos = bsResult;
	    if (pos == -1 || this._compare(this[pos], val) < 0)
	      return (pos+1 < this.length && this._compare(this[pos+1], val) == 0) ? pos+1 : null;
	    while (pos >= 1 && this._compare(this[pos-1], val) == 0) pos--;
	    return pos;
	  };

	  /**
	   * sorted.key(val)
	   * @returns indexes if exists, null if not
	   **/
	  SortedList.prototype.keys = function(val, bsResult) {
	    var ret = [];
	    if (bsResult == null) bsResult = this.bsearch(val);
	    var pos = bsResult;
	    while (pos >= 0 && this._compare(this[pos], val) == 0) {
	      ret.push(pos);
	      pos--;
	    }

	    var len = this.length;
	    pos = bsResult+1;
	    while (pos < len && this._compare(this[pos], val) == 0) {
	      ret.push(pos);
	      pos++;
	    }
	    return ret.length ? ret : null;
	  };

	  /**
	   * sorted.unique()
	   * @param createNew : create new instance
	   * @returns first index if exists, null if not
	   **/
	  SortedList.prototype.unique = function(createNew) {
	    if (createNew) return this.filter(function(v, k) {
	      return k == 0 || this._compare(this[k-1], v) != 0;
	    }, this);
	    var total = 0;
	    this.map(function(v, k) {
	      if (k == 0 || this._compare(this[k-1], v) != 0) return null;
	      return k - (total++);
	    }, this)
	    .forEach(function(k) {
	      if (k != null) this.remove(k);
	    }, this)
	    return this;
	  };

	  /**
	   * sorted.toArray()
	   * get raw array
	   **/
	  SortedList.prototype.toArray = function() {
	    return this.slice();
	  };


	  /**
	   * default filtration function
	   **/
	  SortedList.prototype._filter = function(val, pos) {
	    return true;
	  };


	  /**
	   * comparison functions 
	   **/
	  SortedList.compares = {
	    "number": function(a, b) {
	      var c = a - b;
	      return (c > 0) ? 1 : (c == 0)  ? 0 : -1;
	    },

	    "string": function(a, b) {
	      return (a > b) ? 1 : (a == b)  ? 0 : -1;
	    }
	  };

	  /**
	   * sorted.compare(a, b)
	   * default comparison function
	   **/
	  SortedList.prototype._compare = SortedList.compares["string"];

	  return SortedList;
	}));


/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

	var raf = __webpack_require__(5),
	    now = __webpack_require__(8);

	function Timer() {
	  this.running = false;
	  this.currentTime = 0;
	  this.lastTick = null;
	  this.callbacks = [];
	  this._rate = 1;

	  this._tick = this._tick.bind(this);
	}

	Timer.prototype.start = function(startAtMs) {
	  if (this.running) return;
	  this.running = true;

	  if (typeof startAtMs !== "undefined") {
	    this.set(startAtMs);
	  }

	  this._startTimer();
	};

	Timer.prototype.set = function(ms) {
	  this.lastTick = null;
	  this.currentTime = ms;
	};

	Timer.prototype.pause = function() {
	  if (!this.running) return;
	  this.lastTick = null;
	  this.running = false;
	};

	Timer.prototype.setRate = function(rate) {
	  this._rate = rate;
	};

	Timer.prototype.getRate = function() {
	  return this._rate;
	};

	Timer.prototype._startTimer = function() {
	  this._tick();
	};

	Timer.prototype._tick = function() {
	  if (!this.running) return;

	  if (this.lastTick === null) {
	    this.lastTick = now();
	  } else {
	    var thisTick = now(),
	        delta = thisTick - this.lastTick;
	    this.currentTime = this.currentTime + delta * this._rate;
	    this.lastTick = thisTick;
	  }

	  this.callbacks.forEach(function(callback) {
	    callback(this.currentTime);
	  }.bind(this));

	  raf(this._tick);
	};

	Timer.prototype.register = function(fn) {
	  this.callbacks.push(fn);
	};

	Timer.prototype.unregister = function(fn) {
	  var idx = this.callbacks.indexOf(fn);
	  if (idx > -1) this.callbacks.splice(idx, 1);
	};

	module.exports = Timer;


/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {

	var now = __webpack_require__(6)
	  , global = typeof window === 'undefined' ? {} : window
	  , vendors = ['moz', 'webkit']
	  , suffix = 'AnimationFrame'
	  , raf = global['request' + suffix]
	  , caf = global['cancel' + suffix] || global['cancelRequest' + suffix]
	  , isNative = true

	for(var i = 0; i < vendors.length && !raf; i++) {
	  raf = global[vendors[i] + 'Request' + suffix]
	  caf = global[vendors[i] + 'Cancel' + suffix]
	      || global[vendors[i] + 'CancelRequest' + suffix]
	}

	// Some versions of FF have rAF but not cAF
	if(!raf || !caf) {
	  isNative = false

	  var last = 0
	    , id = 0
	    , queue = []
	    , frameDuration = 1000 / 60

	  raf = function(callback) {
	    if(queue.length === 0) {
	      var _now = now()
	        , next = Math.max(0, frameDuration - (_now - last))
	      last = next + _now
	      setTimeout(function() {
	        var cp = queue.slice(0)
	        // Clear queue here to prevent
	        // callbacks from appending listeners
	        // to the current frame's queue
	        queue.length = 0
	        for(var i = 0; i < cp.length; i++) {
	          if(!cp[i].cancelled) {
	            try{
	              cp[i].callback(last)
	            } catch(e) {
	              setTimeout(function() { throw e }, 0)
	            }
	          }
	        }
	      }, Math.round(next))
	    }
	    queue.push({
	      handle: ++id,
	      callback: callback,
	      cancelled: false
	    })
	    return id
	  }

	  caf = function(handle) {
	    for(var i = 0; i < queue.length; i++) {
	      if(queue[i].handle === handle) {
	        queue[i].cancelled = true
	      }
	    }
	  }
	}

	module.exports = function(fn) {
	  // Wrap in a new function to prevent
	  // `cancel` potentially being assigned
	  // to the native rAF function
	  if(!isNative) {
	    return raf.call(global, fn)
	  }
	  return raf.call(global, function() {
	    try{
	      fn.apply(this, arguments)
	    } catch(e) {
	      setTimeout(function() { throw e }, 0)
	    }
	  })
	}
	module.exports.cancel = function() {
	  caf.apply(global, arguments)
	}


/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {// Generated by CoffeeScript 1.6.3
	(function() {
	  var getNanoSeconds, hrtime, loadTime;

	  if ((typeof performance !== "undefined" && performance !== null) && performance.now) {
	    module.exports = function() {
	      return performance.now();
	    };
	  } else if ((typeof process !== "undefined" && process !== null) && process.hrtime) {
	    module.exports = function() {
	      return (getNanoSeconds() - loadTime) / 1e6;
	    };
	    hrtime = process.hrtime;
	    getNanoSeconds = function() {
	      var hr;
	      hr = hrtime();
	      return hr[0] * 1e9 + hr[1];
	    };
	    loadTime = getNanoSeconds();
	  } else if (Date.now) {
	    module.exports = function() {
	      return Date.now() - loadTime;
	    };
	    loadTime = Date.now();
	  } else {
	    module.exports = function() {
	      return new Date().getTime() - loadTime;
	    };
	    loadTime = new Date().getTime();
	  }

	}).call(this);

	/*
	//@ sourceMappingURL=performance-now.map
	*/

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(7)))

/***/ },
/* 7 */
/***/ function(module, exports) {

	// shim for using process in browser

	var process = module.exports = {};
	var queue = [];
	var draining = false;
	var currentQueue;
	var queueIndex = -1;

	function cleanUpNextTick() {
	    draining = false;
	    if (currentQueue.length) {
	        queue = currentQueue.concat(queue);
	    } else {
	        queueIndex = -1;
	    }
	    if (queue.length) {
	        drainQueue();
	    }
	}

	function drainQueue() {
	    if (draining) {
	        return;
	    }
	    var timeout = setTimeout(cleanUpNextTick);
	    draining = true;

	    var len = queue.length;
	    while(len) {
	        currentQueue = queue;
	        queue = [];
	        while (++queueIndex < len) {
	            if (currentQueue) {
	                currentQueue[queueIndex].run();
	            }
	        }
	        queueIndex = -1;
	        len = queue.length;
	    }
	    currentQueue = null;
	    draining = false;
	    clearTimeout(timeout);
	}

	process.nextTick = function (fun) {
	    var args = new Array(arguments.length - 1);
	    if (arguments.length > 1) {
	        for (var i = 1; i < arguments.length; i++) {
	            args[i - 1] = arguments[i];
	        }
	    }
	    queue.push(new Item(fun, args));
	    if (queue.length === 1 && !draining) {
	        setTimeout(drainQueue, 0);
	    }
	};

	// v8 likes predictible objects
	function Item(fun, array) {
	    this.fun = fun;
	    this.array = array;
	}
	Item.prototype.run = function () {
	    this.fun.apply(null, this.array);
	};
	process.title = 'browser';
	process.browser = true;
	process.env = {};
	process.argv = [];
	process.version = ''; // empty string to avoid regexp issues
	process.versions = {};

	function noop() {}

	process.on = noop;
	process.addListener = noop;
	process.once = noop;
	process.off = noop;
	process.removeListener = noop;
	process.removeAllListeners = noop;
	process.emit = noop;

	process.binding = function (name) {
	    throw new Error('process.binding is not supported');
	};

	process.cwd = function () { return '/' };
	process.chdir = function (dir) {
	    throw new Error('process.chdir is not supported');
	};
	process.umask = function() { return 0; };


/***/ },
/* 8 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {// Generated by CoffeeScript 1.7.1
	(function() {
	  var getNanoSeconds, hrtime, loadTime;

	  if ((typeof performance !== "undefined" && performance !== null) && performance.now) {
	    module.exports = function() {
	      return performance.now();
	    };
	  } else if ((typeof process !== "undefined" && process !== null) && process.hrtime) {
	    module.exports = function() {
	      return (getNanoSeconds() - loadTime) / 1e6;
	    };
	    hrtime = process.hrtime;
	    getNanoSeconds = function() {
	      var hr;
	      hr = hrtime();
	      return hr[0] * 1e9 + hr[1];
	    };
	    loadTime = getNanoSeconds();
	  } else if (Date.now) {
	    module.exports = function() {
	      return Date.now() - loadTime;
	    };
	    loadTime = Date.now();
	  } else {
	    module.exports = function() {
	      return new Date().getTime() - loadTime;
	    };
	    loadTime = new Date().getTime();
	  }

	}).call(this);

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(7)))

/***/ }
/******/ ])
});
;