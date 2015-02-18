var gifs = [
  { name: "ski", count: 176 },
  { name: "helicoptor", count: 153 },
  { name: "jetpack", count: 123 },
  { name: "horse", count: 105 },
  { name: "tail", count: 81 }
];

var kinetophone, audio, lastGifIdx, playing;

var frameImg = document.getElementById("frame"),
    gifSelect = document.getElementById("gifselect"),
    playpause = document.getElementById("playpause"),
    slider = document.getElementById("slider");

gifs.forEach(function(gifset, idx) {
  var opt = document.createElement("option");
  opt.value = idx;
  opt.textContent = gifset.name;
  gifSelect.appendChild(opt);
});

gifSelect.addEventListener("change", function() {
  selectGif(~~gifSelect.value);
});

// Playing/Pausing affects both the Kinetophone's internal
// playhead and the current audio clip.
playpause.addEventListener("click", function() {
  if (playing) {
    playing = false;
    kinetophone.pause();
    audio.pause();
    playpause.textContent = "Play";
  } else {
    playing = true;
    kinetophone.play();
    audio.play();
    playpause.textContent = "Pause";
  }
});

// When the slider's value changes, scrub to
// that position in the Kinetophone.
slider.addEventListener("input", function() {
  var time = ~~slider.value;
  kinetophone.currentTime(time);
  audio.currentTime = time / 1000;
});

selectGif(0);

function selectGif(idx) {
  lastGifIdx = idx;

  if (kinetophone) {
    kinetophone.pause();
    kinetophone.removeAllListeners();
    kinetophone = null;
  }

  if (audio) {
    audio.pause();
  }

  createKinetophone(idx);
}

function createKinetophone(index) {
  var name = gifs[index].name,
      totalDuration = gifs[index].count * 33;

  var frameRange = range(1, gifs[index].count);
  var frameSrcs = frameRange.map(function(frame, index) {
    var img = "" + frame;
    while (img.length < 3) img = "0" + img;
    return "media/" + name + "/ffout" + img + ".jpg";
  });

  // Preload all frames
  frameSrcs.forEach(preloadImage);

  var framesChannel = {
    name: "frame",
    events: range(1, gifs[index].count).map(function(frame, index) {
      return { start: index * 33, duration: 33, data: { src: frameSrcs[index] } };
    })
  };

  var audioChannel = {
    name: "audio",
    events: [
      { start: 0, end: totalDuration, data: { src: "media/" + name + "-audio.mp3" } }
    ]
  };

  kinetophone = new Kinetophone([framesChannel, audioChannel], totalDuration, {tickImmediately: true});

  kinetophone.on("enter:frame", function(frame) {
    frameImg.src = frame.data.src;
  });

  kinetophone.on("enter:audio", function(evt) {
    audio = new Audio();
    audio.src = evt.data.src;
    if (playing) audio.play();
  });

  kinetophone.on("end", function() {
    var nextGifIndex = lastGifIdx + 1;
    if (nextGifIndex >= gifs.length) nextGifIndex = 0;
    selectGif(nextGifIndex);
    gifSelect.value = nextGifIndex;
  });

  kinetophone.on("timeupdate", function(time) {
    slider.value = time;
  });

  slider.max = totalDuration;

  if (playing) kinetophone.play();
}

function preloadImage(src) {
  var img = new Image();
  img.src = src;
}

function range(startInclusive, endInclusive) {
  var result = [];
  for (var i = startInclusive; i <= endInclusive; i++) {
    result.push(i);
  }
  return result;
}
