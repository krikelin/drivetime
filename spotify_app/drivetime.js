sp = getSpotifyApi(1);

exports.init = init;

var drivetimeSocket;
var Drivetime = {

  init: function () {
    drivetimeSocket = io.connect("ws://172.16.104.242:8081");
    drivetimeSocket.on('broadcasters', function (broadcasters) {
      console.log('got broadcasters', broadcasters);
      updateBroadcasters(broadcasters);
    });
  },

  broadcast: function (track) {
    var now = new Date();
    drivetimeSocket.emit('broadcasting', { username: sp.core.getAnonymousUserId(),
                                              track: track.uri,
                                          timestamp: now.getTime() });
  },

  listen: function (user) {
    drivetimeSocket.emit('listen_to', { username: user });

    drivetimeSocket.on('play', function (x) {
      console.log(x);
      playATrack(x.track, x.playlist);
    });
  }

};

function init() {

  Drivetime.init();
  updateNowPlayingUser();

  sp.core.addEventListener("argumentsChanged", function(event) {
    updateNowPlayingUser();
  });

  function updateNowPlayingUser() {
    var args = sp.core.getArguments();

    for (var i = 0, l = args.length; i < l; i++) {
      if(args[i] == 'name') {
        Drivetime.listen(args[i+1]);
        var userId = args[i+1];
      }
    }
  }

  if (sp.core.getAnonymousUserId() != '738130fdbe04d97213c95852701412040836a3b2') {
    Drivetime.listen('738130fdbe04d97213c95852701412040836a3b2');
  }

  updatePageWithTrackDetails();
  sp.trackPlayer.addEventListener("playerStateChanged", function (event) {
    // Only update the page if the track changed
    if (event.data.curtrack == true) {
      updatePageWithTrackDetails();
    }
  });
  
  sp.core.addEventListener("linksChanged", function(event) {
    var playlistURI = sp.core.getLinks()[0];
    var playlist = sp.core.getPlaylist(playlistURI);
    var tracks = new Array();
    for (var i=0; i < playlist.length; i++) {
      var track = playlist.getTrack(i);
      tracks.push(track);
    };
    // now we display those
    var playlistElement = document.getElementById("playlist");
    playlistElement.innerHTML = "";
    var tracksHTML = "";
    for (var i=0; i < tracks.length; i++) {
      var even = false;
      if(i % 2 == 0) {
        even = true
      }
      
      var rowtag = "<tr>";
      if(even) {
        rowtag = "<tr class='even'>";
      }
      
      tracksHTML = tracksHTML + rowtag + "<td><a class='tracklink' href='" + tracks[i].uri + "'>" + tracks[i].name + "</a></td>" + "<td>" + tracks[i].album.name + "</td>" + "<td>" + tracks[i].album.artist.name + "</td>" + "<td>" + millisToTimeString(tracks[i].duration) + "</td>" + "</tr>"
    };
    
    playlistElement.innerHTML = "<h2>Your Playlist</h2><table cellspacing='0'><thead><tr><th>Track</th><th>Album</th><th>Artist</th><th>Duration</th></tr></thead><tbody>" + tracksHTML  + "</tbody></table>"
    
    jQuery("a.tracklink").unbind();
    jQuery(document).on("click", "a.tracklink", function() {
      playATrack(this.href, playlistURI);
      return false;
    });
  });
  
}

function playATrack (trackUri, playlistUri) {

  sp.trackPlayer.playTrackFromContext(trackUri, 2, playlistUri,  {
              onSuccess: function() { console.log("success"); },
              onFailure: function () { console.log("failure"); },
              onComplete: function () { console.log("complete"); }
  });
}

function updatePageWithTrackDetails() {

  var nowPlaying = document.getElementById("nowplaying");

  // This will be null if nothing is playing.
  var playerTrackInfo = sp.trackPlayer.getNowPlayingTrack();

  if (playerTrackInfo == null) {
    nowPlaying.innerText = "Nothing playing!";
  } else {
    var track = playerTrackInfo.track;
    nowPlaying.innerText = track.name + " on the album " + track.album.name + " by " + track.album.artist.name + ".";

    Drivetime.broadcast(track);
  }
}

function updateBroadcasters(broadcasters) {
    // this gets a list of broadcasters, each one a hash with some info about what the broadcaster is broadcasting.
}

function millisToTimeString(millis) {
  var seconds = millis / 1000;
  var fullMinutes = Math.floor(seconds / 60);
  var remainingSeconds = seconds - (60 * fullMinutes);
  if(remainingSeconds.toString().length < 2) {
    remainingSeconds = "0" + remainingSeconds;
  }
  return fullMinutes + ":" + remainingSeconds;
}
