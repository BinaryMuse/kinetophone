var kinetophone,
    audio,
    lastGifIdx,
    playing = false;

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
  selectGif(gifSelect.value);
});

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
  var name = gifs[index].name;
  var totalDuration = gifs[index].count * 33;

  var framesChannel = {
    name: "frames",
    events: range(1, gifs[index].count).map(function(frame, index) {
      var img = "" + frame;
      while (img.length < 3) img = "0" + img;
      var src = "media/" + name + "/ffout" + img + ".jpg";

      preloadImage(src);

      return {
        start: index * 33,
        duration: 33,
        data: { src: src }
      };
    })
  };

  var audioChannel = {
    name: "audio",
    events: [
      { start: 0, end: totalDuration, data: { src: "media/" + name + "-audio.mp3" } }
    ]
  };

  kinetophone = new Kinetophone([framesChannel, audioChannel], totalDuration, {tickImmediately: true});

  kinetophone.on("start", function(evt) {
    if (evt.name === "frames") {
      frameImg.src = evt.data.src;
    } else if (evt.name === "audio") {
      audio = new Audio();
      audio.src = evt.data.src;
      if (playing) audio.play();
    }
  });

  kinetophone.on("finish", function() {
    var nextGifIndex = lastGifIdx + 1;
    if (nextGifIndex >= gifs.length) nextGifIndex = 0;
    gifSelect.value = nextGifIndex;
    selectGif(nextGifIndex);
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
