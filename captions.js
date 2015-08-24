var videoEl = document.getElementById("video");
var captionEl = document.getElementById("caption");
var timingsEl = document.getElementById("currenttimings");

var captions = [
  [0,      ""],
  [10,     "Before long a standard news report visual language extablished itself, one that's immediate recognizable to anyone."],
  [6731,   "Me has this report."],
  [9062,   "It starts here, with a lackluster establishing shot of a significant location."],
  [14371,  "Next, a walky, talky preable from the orator, pacing steadily towards the lense,"],
  [19016,  "punctuating every other sentence with a hand gesture, and ignoring all the pricks milling around him"],
  [23806,  "like he's gliding through the fucking matrix,"],
  [25709,  "before coming to a halt and posing a question:"],
  [28597,  "What comes next?"],

  [30893,  "Often something like this: a filler shot designed to give your eyes someting to look at"],
  [34840,  "while my voice babbles on about facts."],
  [37287,  "Sometimes it'll slow down to a halt, turn monochrome, and some of those facts will appear one by one on the screen."],
  [43268,  "This is followed by the obligatory shots of overweight people with their faces subley framed out"],
  [47866,  "after which the report is padded out with a selection of lazy and pointless vox pops."],

  [52486,  "Umm, you usually get some inane chatter from people."],
  [55557,  "I think they do have too much, I think what we wanna hear is actually what's happening and not what other people think of it."],
  [61101,  "I... I hate these sound bites, I don't want some punter's opinion usually, no."],

  [69047,  "Another bit of dull visual abstraction to plug another gap now before the report segues gracefully into a bit of human interest"],
  [74908,  "courtesy of some dowdy man opening letters in a kitchen and explaining how he's been affected by the issue."],

  [79737,  "When I'm watchin' the news, I don't really, you know, there's a person talkin' to me, tellin' me what's goin' on"],
  [84967,  "an' I don't really listen to what they're sayin'. It's just news. It's just news."],

  [89802,  "He unfortunately was boring, so to wake you up, this is an animated chart, this is a silhouette representing the average family,"],
  [95614,  "and this is a lighthouse keeper being beheaded by a laser beam."],

  [98909,  "As we near the end of the report, illustrative shots of pedestrians and signs and a pipe at a window--"],
  [104164, "And then the final summary, ending on a whimshical shot of something nearby, accompanied by a wry sign-off."],
  [110949, "If you're lucky, a bit of word-play fit or a king, or in other words, Regent Street."],

  [115996, "Charlie Brooker, News Wipe, London"],
  [118899, ""]
];

var captionChannel = {
  name: "caption",
  timings: captions.map(function(cap, idx) {
    var timing = {
      start: cap[0],
      data: {
        text: cap[1]
      }
    };
    var nextCap = captions[idx + 1];
    if (nextCap) {
      timing.end = nextCap[0] - 1;
    } else {
      timing.end = 122 * 1000
    }

    return timing;
  })
};

var kinetophone = new Kinetophone([captionChannel], 122 * 1000, {tickImmediately: false});
var currentCaption = null;

kinetophone.on("enter:caption", function(caption) {
  captionEl.textContent = caption.data.text;
  currentCaption = caption.data.text;
});

kinetophone.on("exit:caption", function(caption) {
  if (currentCaption === caption.data.text) {
    captionEl.textContent = "";
  }
});

videoEl.addEventListener("timeupdate", function() {
  kinetophone.currentTime(videoEl.currentTime * 1000);
});
