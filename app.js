var kinetophone, currentAudio;

var FRAME_TIME = 33,
    SKIP_FRAMES = 2;

var imageSets = [
  { name: "ski", count: 176 },
  { name: "helicoptor", count: 153 },
  { name: "jetpack", count: 123 },
  { name: "horse", count: 105 },
  { name: "tail", count: 81 }
];

// Each image set starts when the last one ended.
imageSets.forEach(function(imageset, index) {
  if (index === 0) {
    imageset.start = 0;
  } else {
    imageset.start = imageSets[index - 1].start + imageSets[index - 1].count * FRAME_TIME;
  }
});

// The total duration of the Kinetophone's playback is the
// sum of each of the image set's playback.
var totalDuration = imageSets.reduce(function(acc, imageset) {
  return acc + imageset.count * FRAME_TIME;
}, 0);

var frameImg = document.getElementById("frame"),
    playpause = document.getElementById("playpause"),
    slider = document.getElementById("slider");

slider.max = totalDuration;

// Playing/Pausing affects both the Kinetophone's internal
// playhead and the current audio clip.
playpause.addEventListener("click", function() {
  if (kinetophone.playing()) {
    kinetophone.pause();
    currentAudio && currentAudio.audio.pause();
    playpause.textContent = "Play";
  } else {
    kinetophone.play();
    currentAudio && currentAudio.audio.play();
    playpause.textContent = "Pause";
  }
});

// When the slider's value changes, scrub to
// that position in the Kinetophone.
slider.addEventListener("input", function() {
  var time = ~~slider.value;
  kinetophone.currentTime(time);
});

// For the frames channel, we'll build an array of frame events for
// each image set, then combine them into one big array at the end.
// We'll also cut out every other frame to make the demo run a bit
// better.
var framesChannel = {
  name: "frame",
  events: imageSets.map(function(imageset) {
    return range(1, imageset.count).map(function(frame, frameIdx) {
      var img = "" + frame;
      while (img.length < 3) img = "0" + img;
      var src = "media/" + imageset.name + "/ffout" + img + ".jpg";

      return {
        start: imageset.start + frameIdx * FRAME_TIME,
        duration: FRAME_TIME * SKIP_FRAMES,
        data: { index: frameIdx, src: src }
      };
    });
  }).reduce(function(acc, curr) {
    return acc.concat(curr);
  }, []).filter(function(frame) {
    return frame.data.index % SKIP_FRAMES === 0;
  })
};

// We have one audio clip per image set; each starts when the
// image set starts, and lasts for the duration of the image set.
var audioChannel = {
  name: "audio",
  events: imageSets.map(function(imageset, index) {
    // Rather than returning the source of the audio file to load
    // when the event starts, we'll create the audio file here so
    // it's already started loading by the time we want to play it.
    var audio = new Audio();
    audio.src = "media/" + imageset.name + "-audio.mp3";
    return {
      start: imageset.start,
      duration: imageset.count * FRAME_TIME,
      data: {
        audio: audio
      }
    };
  })
};

// Two seconds before we show each image, we'll preload it so we
// don't get gaps in playback.
var preloadChannel = {
  name: "preload",
  events: framesChannel.events.map(function(frame) {
    var start = frame.start - 2000;
    if (start < 0) start = 0;

    return {
      start: start,
      duration: 2000,
      data: { src: frame.data.src }
    };
  })
};

var channels = [framesChannel, audioChannel, preloadChannel];
kinetophone = new Kinetophone(channels, totalDuration, {tickImmediately: true});

// When we get a 'preload' event, we just want to preload the image.
kinetophone.on("enter:preload", function(image) {
  preloadImage(image.data.src);
});

// When we get a 'frame' event, show it in the DOM.
kinetophone.on("enter:frame", function(frame) {
  frameImg.src = frame.data.src;
});

// When we get an 'audio' event, we want to start the audio
// playing (assuming the Kinetophone is playing). However,
// it's possible we jumped into the middle of the audio
// event, so we need to calculate the correct offset.
kinetophone.on("enter:audio", function(evt) {
  currentAudio = {
    start: evt.start,
    audio: evt.data.audio
  }

  var offset = kinetophone.currentTime() - evt.start;
  currentAudio.audio.currentTime = offset / 1000;
  if (kinetophone.playing()) currentAudio.audio.play();
});

// When we *exit* an audio event, we want to pause the currently
// playing audio (if any) and reset its time to 0 so it's ready
// to play the next time it enters.
//
// Note: this only works as written as we have no overlapping audio
// events.
kinetophone.on("exit:audio", function(evt) {
  if (currentAudio) {
    currentAudio.audio.pause();
    currentAudio.audio.currentTime = 0;
  }
});

// Loop the Kinetophone!
kinetophone.on("end", function() {
  kinetophone.play();
});

// Keep the slider up to date with the current time.
kinetophone.on("timeupdate", function(time) {
  slider.value = time;
});

// When we jump to an arbitrary time, we need to update
// the current audio track (if any) to the correct position.
kinetophone.on("seek", function(time) {
  if (currentAudio) {
    currentAudio.audio.pause();
    var start = currentAudio.start,
        offset = time - start;
    currentAudio.audio.currentTime = offset / 1000;
    if (kinetophone.playing()) currentAudio.audio.play();
  }
});

var preloads = {};
function preloadImage(src) {
  // Only preload each image once.
  if (preloads[src]) return;

  setTimeout(function() {
    var img = new Image();
    img.src = src;
  });

  preloads[src] = true;
}

function range(startInclusive, endInclusive) {
  var result = [];
  for (var i = startInclusive; i <= endInclusive; i++) {
    result.push(i);
  }
  return result;
}
