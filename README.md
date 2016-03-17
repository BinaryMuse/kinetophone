Kinetophone
===========

![Kinetophone](https://raw.githubusercontent.com/BinaryMuse/kinetophone/master/images/kinetophone.jpg)

Kinetophone is a library for stitching together and controlling the playback of time-sequenced events with durations. Its primary use-case is to turn a series of audio and image files into a faux video.

Installation
------------

Kinetophone is available on npm:

    npm install [--save] kinetophone

You can then require it as normal:

    var Kinetophone = require("kinetophone");

Kinetophone is also available on Bower:

    bower install [--save] kinetophone

Kinetophone also works with browser module bundlers like Browserify and webpack.

Example
-------

Here's a simple Kinetophone app that will display a series of images, one per second.

```html
<image id="display">
```

```javascript
var numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

var numberChannel = {
  name: "numbers",
  timings: numbers.map(function(number, index) {
    return {
      start: 1000 * index,
      duration: 1000,
      data: {
        src: "/media/image" + number + ".png"
      }
    };
  })
};

var kinetophone = new Kinetophone([numberChannel], 10000),
    image = document.getElementById("display");

kinetophone.on("enter", function(evt) {
  image.src = evt.data.src;
});

kinetophone.play();
```

For more complete examples, check out [the demos on the Kinetophone home page](http://binarymuse.github.io/kinetophone/) and the [associated source code](https://github.com/BinaryMuse/kinetophone/tree/gh-pages).

Usage
-----

**`new Kinetophone(channels, totalDuration[, options])`**

Constructs a new Kinetophone instance.

* `channels` - an array of channels (see [Channels](#channels), below)
* `totalDuration` - the total duration of the timeline. All timings must start on or after `0` ms and end on or before `totalDuration` ms.
* `options` - an optional object containing options:
  * `options.timeUpdateResolution` - the minimum number of milliseconds between internal updates (controls how often Kinetophone checks for "current" timings and the frequency of `timeupdate` events); defaults to `33`
  * `options.tickImmediately` - if true, Kinetophone will emit a `timeupdate` event for time `0` and any timings with a `start` of `0` on the next tick (to give you time to attach event handlers); defaults to `false`

**`Kinetophone#addChannel(channel)`**

Adds a channel to the Kinetophone.

* `channel` - the channel to add (see [Channels](#channels), below)

**`Kinetophone#addTiming(channelName, timing)`**

Adds a timing to an existing channel identified by the name `channelName`.

* `channelName` - the name of the channel to add the timing to
* `timing` - the timing to add

**`Kinetophone#totalDuration([duration])`**

Gets (when given no arguments) or sets (when given a numeric argument) the Kinetophone's total timeline duration. Note that setting this value rebuilds the internal interval tree for every channel, so it's better to set this before you add any channels (e.g. in the constructor).

* `duration` - the total duration of the timeline in milliseconds.

**`Kinetophone#pause()`**

Pauses the Kinetophone.

**`Kinetophone#play()`**

Starts (or resumes) the Kinetophone.

**`Kinetophone#playbackRate([rate])`**

Gets (when given no arguments) or sets (when given a numeric argument) the Kinetophone's playback rate. `0.25` will play at quarter speed, while `3` will play three times as fast as normal.

**`Kinetophone#currentTime([ms])`**

Gets (when given no arguments) or sets (when given a numeric argument) the Kinetophone's current time in milliseconds.

* `ms` - optional time in milliseconds to set the current playback time to; if not given, returns the current playback time instead

**`Kinetophone#playing()`**

Returns whether or not the Kinetophone is currently playing.

**`{channelName: [timings]} : Kinetophone#getTimingsAt(time[, channels])`**

Returns the timings that are active at `time` milliseconds.

* `time` - the time, in milliseconds, to find timings at
* `channels` - an optional string or array of strings indicating which channels to search

**`{channelName: [timings]} : Kinetophone#getTimingsBetween(start, end[, channels])`**

Returns the timings that are active at some point between `start` and `end` milliseconds. Returns timings that start *before* `start` or that end *after* `end` as long as they are active at some point in the given range.

* `start` - the time, in milliseconds, to start finding timings at
* `end` - the time, in milliseconds, to stop finding timings at
* `channels` - an optional string or array of strings indicating which channels to search

**`Kinetophone#on(event, handler)`**

From [EventEmitter3](https://github.com/primus/eventemitter3), subscribes to events on the Kinetophone. See [the Node.js EventEmitter API](http://nodejs.org/api/events.html) for more details.

Also `Kinetophone#addListener(event, handler)`

**`Kinetophone#off(event, handler)`**

Also `Kinetophone#removeListener(event, handler)`

From [EventEmitter3](https://github.com/primus/eventemitter3), unsubscribes from events on the Kinetophone. See [the Node.js EventEmitter API](http://nodejs.org/api/events.html) for more details.

**Other EventEmitter Methods**

Since Kinetophone instances inherit from EventEmitter3, all other [EventEmitter methods](http://nodejs.org/api/events.html) are available.

### Events

During playback, a Kinetophone instance will emit events indicating that channel timings (see [Channels](#channels), below, for more information on timings) have entered or exited and to indicate other status changes. Here are the events Kinetophone emits and the arguments passed to the event handlers.

**`enter(timing)`**

**`enter:chname(timing)`**

Indicates a channel's timing has been entered. For example, if a timing has a `start` of `1000`, when the Kinetophone playback reaches 1000 milliseconds, an `enter` event will be emitted for that timing.

Event handlers for `enter` will fire for every channel's timings; event handlers for `enter:chname`, where `chname` is the name of a channel, will fire only for timings from that channel.

* `chname` - the name of a channel, used to scope listeners to specific channels
* `timing` - the channel timing entering
  * `timing.name` - the name of the channel the timing belongs to
  * `timing.start` - the start time of the timing
  * `timing.end` - the end time of the timing if provided
  * `timing.duration` - the duration of the timing if provided
  * `timing.data` - the data for the timing if provided

**`exit(timing)`**

**`exit:chname(timing)`**

Indicates a channel's timing has been exited. For example, if a timing has a `start` of `0` and a `duration` or `end` of `1000`, when the Kinetophone playback reaches 1000 milliseconds, an `exit` event will be emitted for that timing.

Event handlers for `exit` will fire for every channel's timings; event handlers for `exit:chname`, where `chname` is the name of a channel, will fire only for timings from that channel.

* `chname` - the name of a channel, used to scope listeners to specific channels
* `timing` - the channel timing exiting
  * `timing.name` - the name of the channel the timing belongs to
  * `timing.start` - the start time of the timing
  * `timing.end` - the end time of the timing if provided
  * `timing.duration` - the duration of the timing if provided
  * `timing.data` - the data for the timing if provided

**`play`**

Indicates the Kinetophone was started or resumed.

**`pause`**

Indicates the Kinetophone was paused.

**`timeupdate(time)`**

Indicates the Kinetophone's playhead has moved. Also emitted after calling `currentTime(ms)`. Emitted before timings at the new time are entered/exited.

* `time` - the current (new) playhead time

**`seeking(time)`**

Indicates the Kinetophone received a request to move the playhead to a new time using `currentTime(ms)`. Emitted before timings at the new time are entered/exited.

**`seek(time)`**

Indicates the Kinetophone's playhead was seeked to a specific time using `currentTime(ms)`. Emitted after the timings at the new time are entered/exited.

* `time` - the time that was seeked to

**`end`**

Indicates the Kinetophone has stopped because it reached the end of its total duration.

**`rateupdate(rate)`**

Indicates the Kinetophone's playback rate has changed.

### Channels

A channel is a description of a series of related timings. For example, a single Kinetophone instance might contain a channel containing clips of audio to play at certain times in the timeline and another channel containing images to display at other times. Each channel has a name and an array of timings; every channel must have a unique name per Kinetophone instance.

From a technical standpoint, a channel conforms to the following specification:

```javascript
var channel = {
  name: String,
  timings: [Timing]
};
```

where an timing is defined as:

```javascript
{
  start: Number,
  [end | duration: Number],
  [data: Mixed]
}
```

`start` is the time in milliseconds that the timing should start at; `end` is the time in milliseconds that the timing should end. You can pass `duration` instead of `end` and Kinetophone will calculate the end time for you, but you cannot pass both. If you pass neither, the timing will last for 1 millisecond. `data` is also optional, and if provided, can be any data that describes the timing.

For example, here's how you might define a channel that displays a different image every second for four seconds.

```javascript
var imageChannel = {
  name: "images",
  timings: [
    { start: 0,    end: 1000, data: { src: "/public/image01.png" } },
    { start: 1000, end: 2000, data: { src: "/public/image02.png" } },
    { start: 2000, end: 3000, data: { src: "/public/image03.png" } },
    { start: 3000, end: 4000, data: { src: "/public/image04.png" } }
  ]
};
```

Channels can describe any data you want; while it's common to use them to describe when audio, video, or images should be displayed, you can use them to determine when you should preload data, when you should show or hide text, or when to execute arbitrary code.

License
-------

Kinetophone is licensed under the [MIT license](LICENSE).

> The MIT License (MIT)
>
> Copyright (c) 2015 Michelle Tilley
>
> Permission is hereby granted, free of charge, to any person obtaining a copy
> of this software and associated documentation files (the "Software"), to deal
> in the Software without restriction, including without limitation the rights
> to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
> copies of the Software, and to permit persons to whom the Software is
> furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in
> all copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
> IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
> FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
> AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
> LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
> OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
> THE SOFTWARE.
