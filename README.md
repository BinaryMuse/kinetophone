Kinetophone
===========

![Kinetophone](https://raw.githubusercontent.com/BinaryMuse/kinetophone/master/images/kinetophone.jpg)

Kinetophone is a library for stitching together time-sequenced events. Its primary use-case is to turn a series of audio and video files into a faux video.

Installation
------------

Kinetophone is available on npm:

    npm install [--save] kinetophone

You can then require it as normal:

    var Kinetophone = require("kinetophone");

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
  events: numbers.map(function(number, index) {
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

* `channels` - an array of channels (see "Channels" below)
* `totalDuration` - the total duration of the timeline. All events must start on or after `0` ms and end on or before `totalDuration` ms.
* `options` - an optional object containing options:
  * `options.timeUpdateResolution` - the minimum number of milliseconds between internal updates (controls how often Kinetophone checks for "current" events and the frequency of `timeupdate` events); defaults to `33`
  * `options.tickImmediately` - if true, Kinetophone will emit a `timeupdate` event for time `0` and any events with a `start` of `0` on the next tick (to give you time to attach event handlers); defaults to `false`

**`Kinetophone#pause()`**

Pauses the Kinetophone.

**`Kinetophone#play()`**

Starts (or resumes) the Kinetophone.

**`Kinetophone#currentTime([ms])`**

Gets (when given no arguments) or sets (when given a numeric argument) the Kinetophone's current time in milliseconds.

**`Kinetophone#on(event, handler)`**

From [EventEmitter3](https://github.com/primus/eventemitter3), subscribes to events on the Kinetophone. See [the Node.js EventEmitter API](http://nodejs.org/api/events.html) for more details.

Also `Kinetophone#addListener(event, handler)`

**`Kinetophone#off(event, handler)`**

Also `Kinetophone#removeListener(event, handler)`

From [EventEmitter3](https://github.com/primus/eventemitter3), unsubscribes from events on the Kinetophone. See [the Node.js EventEmitter API](http://nodejs.org/api/events.html) for more details.

**Other EventEmitter Methods**

Since Kinetophone instances inherit from EventEmitter3, all other [EventEmitter methods](http://nodejs.org/api/events.html) are available.

### Events

During playback, a Kinetophone instance will emit events indicating that channel events (see "Channels" below for more information on events) have entered or exited and to indicate other status changes. Here are the events Kinetophone emits and the arguments passed to the event handlers.

**`enter(event)`**

**`enter:chname(event)`**

Indicates a channel's event has been entered. For example, if an event has a `start` of `1000`, when the Kinetophone playback reaches 1000 milliseconds, an `enter` event will be emitted for that event.

Event handlers for `enter` will fire for every channel's event; event handlers for `enter:chname`, where `chname` is the name of a channel, will fire only for events from that channel.

* `chname` - the name of a channel, used to scope listeners to specific channels
* `event` - the channel event entering
  * `event.name` - the name of the channel the event belongs to
  * `event.start` - the start time of the event
  * `event.end` - the end time of the event if provided
  * `event.duration` - the duration of the event if provided
  * `event.data` - the data for the event if provided

**`exit(event)`**

**`exit:chname(event)`**

Indicate a channel's event has been exited. For example, if an event has a `start` of `0` and a `duration` or `end` of `1000`, when the Kinetophone playback reaches 1000 milliseconds, an `exit` event will be emitted for that event.

Event handlers for `exit` will fire for every channel's event; event handlers for `exit:chname`, where `chname` is the name of a channel, will fire only for events from that channel.

* `chname` - the name of a channel, used to scope listeners to specific channels
* `event` - the channel event exiting
  * `event.name` - the name of the channel the event belongs to
  * `event.start` - the start time of the event
  * `event.end` - the end time of the event if provided
  * `event.duration` - the duration of the event if provided
  * `event.data` - the data for the event if provided

**`play`**

Indicates the Kinetophone was started or resumed.

**`pause`**

Indicates the Kinetophone was paused.

**`timeupdate(time)`**

Indicates the Kinetophone's playhead has moved. Also emitted after calling `currentTime(ms)`.

* `time` - the current (new) playhead time

**`seek(time)`**

Indicates the Kinetophone's playhead was seeked to a specific time using `currentTime(ms)`.

* `time` - the time that was seeked to

**`end`**

Indicates the Kinetophone has stopped because it reached the end of its total duration.

### Channels

A channel is a description of a series of related events. For example, a single Kinetophone instance might contain a channel containing clips of audio to play at certain times in the timeline and another channel containing images to display at other times. Each channel has a name and an array of events; every channel must have a unique name per Kinetophone instance.

From a technical standpoint, a channel conforms to the following specification:

```javascript
var channel = {
  name: String,
  events: [Event]
};
```

where an event is defined as:

```javascript
{
  start: Number,
  [end | duration: Number],
  [data: Mixed]
}
```

`start` is the time in milliseconds that the event should start; `end` is the time in milliseconds that the event should end. You can pass `duration` instead of `end` and Kinetophone will calculate the end time for you, but you cannot pass both. If you pass neither, the event will last for 1 millisecond. `data` is also optional, and if provided, can be any data that describes the event.

For example, here's how you might define a channel that displays a different image every second for four seconds.

```javascript
var imageChannel = {
  name: "images",
  events: [
    { start: 0,    end: 1000, data: { src: "/public/image01.png" } },
    { start: 1000, end: 2000, data: { src: "/public/image02.png" } },
    { start: 2000, end: 3000, data: { src: "/public/image03.png" } },
    { start: 3000, end: 4000, data: { src: "/public/image04.png" } }
  ]
};
```

Channels can describe any data you want; while it's common to use them to describe when audio, video, or images should be displayed, you can use them to determine when you should preload data, when you should show or hide text, or when to execute arbitrary code.
