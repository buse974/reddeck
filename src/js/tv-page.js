/**
 * YouTube DJ Mixer - TV
 * v3.41
 */

// Players YouTube
let playerA = null;
let playerB = null;
let playersReady = { A: false, B: false };
let loadedVideos = { A: null, B: null };
let volumes = { A: 100, B: 100 };
let masterVolume = 80;
let debugMode = false;
let debugCount = 0;

// BroadcastChannel pour communication avec index.html
const channel = new BroadcastChannel("dj-karaoke");

function setStatus(msg) {
  const s = document.getElementById("status");
  s.textContent = msg;
  s.style.opacity = 1;
  setTimeout(() => (s.style.opacity = 0), 2000);
}

function debugLog(type, message, level = "info") {
  if (!debugMode) return;

  debugCount++;
  const logsDiv = document.getElementById("debugLogs");
  const countSpan = document.getElementById("debugCount");

  const now = new Date();
  const time = now.toLocaleTimeString("fr-FR", { hour12: false });

  const logDiv = document.createElement("div");
  logDiv.className = "debug-log " + level;
  logDiv.innerHTML =
    '<span class="time">' +
    time +
    '</span><span class="type">' +
    type +
    "</span>" +
    message;

  logsDiv.insertBefore(logDiv, logsDiv.firstChild);
  countSpan.textContent = debugCount;

  // Garder max 100 logs
  while (logsDiv.children.length > 100) {
    logsDiv.removeChild(logsDiv.lastChild);
  }
}

function setDebugMode(enabled) {
  debugMode = enabled;
  const panel = document.getElementById("debugPanel");
  panel.classList.toggle("visible", enabled);
  if (enabled) {
    debugLog("SYSTEM", "Debug mode activé");
  }
}

// Callback appelé quand l'API YouTube est prête
function onYouTubeIframeAPIReady() {
  debugLog("API", "YouTube IFrame API Ready");

  playerA = new YT.Player("playerA", {
    height: "100%",
    width: "100%",
    playerVars: {
      autoplay: 0,
      controls: 0,
      disablekb: 1,
      fs: 0,
      modestbranding: 1,
      rel: 0,
      showinfo: 0,
      iv_load_policy: 3,
    },
    events: {
      onReady: () => onPlayerReady("A"),
      onStateChange: (e) => onPlayerStateChange("A", e),
    },
  });

  playerB = new YT.Player("playerB", {
    height: "100%",
    width: "100%",
    playerVars: {
      autoplay: 0,
      controls: 0,
      disablekb: 1,
      fs: 0,
      modestbranding: 1,
      rel: 0,
      showinfo: 0,
      iv_load_policy: 3,
    },
    events: {
      onReady: () => onPlayerReady("B"),
      onStateChange: (e) => onPlayerStateChange("B", e),
    },
  });
}

function onPlayerReady(deck) {
  debugLog("PLAYER", "Player " + deck + " ready");
  playersReady[deck] = true;

  if (playersReady.A && playersReady.B) {
    setStatus("Players prêts");
    debugLog("PLAYER", "Tous les players sont prêts");
    channel.postMessage({ type: "karaoke-ready" });
    setTimeout(() => {
      channel.postMessage({ type: "request-sync" });
    }, 300);
  }
}

function onPlayerStateChange(deck, event) {
  const states = {
    "-1": "UNSTARTED",
    0: "ENDED",
    1: "PLAYING",
    2: "PAUSED",
    3: "BUFFERING",
    5: "CUED",
  };
  debugLog(
    "STATE",
    "Player " + deck + " -> " + (states[event.data] || event.data),
  );

  // Quand la vidéo est prête, envoyer la durée à index
  if (event.data === 5 || event.data === 1) {
    const player = getPlayer(deck);
    setTimeout(() => {
      if (player && player.getDuration) {
        const duration = player.getDuration();
        debugLog(
          "DURATION",
          deck + ": " + duration + "s (state: " + event.data + ")",
        );
        if (duration > 0) {
          channel.postMessage({
            type: "duration",
            deck: deck,
            duration: duration,
          });
        }
      }
    }, 500);
  }
}

function getPlayer(deck) {
  return deck === "A" ? playerA : playerB;
}

// Charger une vidéo
function loadVideo(deck, videoId, startTime) {
  const player = getPlayer(deck);
  if (!player || !playersReady[deck]) {
    debugLog("LOAD", "Player " + deck + " not ready!", "error");
    return;
  }

  startTime = startTime || 0;

  if (loadedVideos[deck] === videoId) {
    debugLog("LOAD", deck + ": seek to " + startTime + "s (même vidéo)");
    player.seekTo(startTime, true);
  } else {
    debugLog("LOAD", deck + ": " + videoId + " at " + startTime + "s");
    player.loadVideoById({
      videoId: videoId,
      startSeconds: startTime,
    });
    loadedVideos[deck] = videoId;
  }

  document.getElementById("waitingMessage").style.display = "none";
}

// Contrôles
function playDeck(deck) {
  const player = getPlayer(deck);
  if (player && playersReady[deck]) {
    debugLog("PLAY", "Deck " + deck);
    player.playVideo();
  } else {
    debugLog("PLAY", "Deck " + deck + " - player non prêt!", "error");
  }
}

function pauseDeck(deck) {
  const player = getPlayer(deck);
  if (player && playersReady[deck]) {
    debugLog("PAUSE", "Deck " + deck);
    player.pauseVideo();
  } else {
    debugLog("PAUSE", "Deck " + deck + " - player non prêt!", "error");
  }
}

function seekDeck(deck, time) {
  const player = getPlayer(deck);
  if (player && playersReady[deck]) {
    debugLog("SEEK", "Deck " + deck + " -> " + time.toFixed(1) + "s");
    player.seekTo(time, true);
  } else {
    debugLog("SEEK", "Deck " + deck + " - player non prêt!", "error");
  }
}

function setVolumeDeck(deck, volume) {
  volumes[deck] = volume;
  applyVolume(deck);
}

function setMasterVolume(volume) {
  masterVolume = volume;
  applyVolume("A");
  applyVolume("B");
}

function applyVolume(deck) {
  const player = getPlayer(deck);
  if (player && playersReady[deck]) {
    const finalVolume = (volumes[deck] / 100) * (masterVolume / 100) * 100;
    player.setVolume(finalVolume);
  }
}

function updateOpacity(pos) {
  const contA = document.getElementById("playerContainerA");
  const contB = document.getElementById("playerContainerB");

  const opA = 1 - pos / 100;
  const opB = pos / 100;

  contA.style.opacity = opA;
  contB.style.opacity = opB;

  if (opA >= opB) {
    contA.style.zIndex = 2;
    contB.style.zIndex = 1;
  } else {
    contA.style.zIndex = 1;
    contB.style.zIndex = 2;
  }
}

// Réception des commandes depuis index.html
channel.onmessage = function (event) {
  const data = event.data;
  debugLog("RECV", data.type + " " + JSON.stringify(data).substring(0, 60));

  switch (data.type) {
    case "debug":
      setDebugMode(data.enabled);
      break;

    case "load":
      loadVideo(data.deck, data.videoId, data.startTime);
      break;

    case "play":
      playDeck(data.deck);
      break;

    case "pause":
      pauseDeck(data.deck);
      break;

    case "seek":
      seekDeck(data.deck, data.time);
      break;

    case "volume":
      setVolumeDeck(data.deck, data.volume);
      break;

    case "masterVolume":
      setMasterVolume(data.volume);
      break;

    case "crossfader":
      updateOpacity(data.position);
      break;

    case "sync":
      if (data.deckA && data.deckA.videoId) {
        loadVideo("A", data.deckA.videoId, data.deckA.currentTime);
        if (data.deckA.isPlaying) {
          setTimeout(() => playDeck("A"), 500);
        }
      }
      if (data.deckB && data.deckB.videoId) {
        loadVideo("B", data.deckB.videoId, data.deckB.currentTime);
        if (data.deckB.isPlaying) {
          setTimeout(() => playDeck("B"), 500);
        }
      }
      if (data.crossfaderPosition !== undefined) {
        updateOpacity(data.crossfaderPosition);
      }
      if (data.masterVolume !== undefined) {
        setMasterVolume(data.masterVolume);
      }
      setStatus("Synchronisé!");
      break;

    case "switch":
      debugLog("SWITCH", "Deck actif: " + data.deck);
      break;
  }
};

setStatus("Chargement API YouTube...");
debugLog("SYSTEM", "Karaoke initialisé");

// Bouton Sync - débloque l'autoplay
let syncActivated = false;

document.getElementById("syncButton").addEventListener("click", function () {
  debugLog("SYNC", "Synchronisation activée par l'utilisateur");
  syncActivated = true;

  // Cacher l'overlay
  document.getElementById("syncOverlay").classList.add("hidden");

  // Demander une sync au mixer (qui va charger les vidéos)
  channel.postMessage({ type: "request-sync" });
  setStatus("Synchronisé!");
});

// Envoyer un message quand la fenêtre se ferme
window.addEventListener("beforeunload", function () {
  channel.postMessage({ type: "karaoke-closed" });
});

// Envoyer le temps actuel à index toutes les 500ms
setInterval(function () {
  ["A", "B"].forEach(function (deck) {
    const player = getPlayer(deck);
    if (player && playersReady[deck] && loadedVideos[deck]) {
      try {
        const currentTime = player.getCurrentTime() || 0;
        const duration = player.getDuration() || 0;
        const playerState = player.getPlayerState();
        const isPlaying = playerState === 1;
        if (duration > 0) {
          channel.postMessage({
            type: "timeupdate",
            deck: deck,
            currentTime: currentTime,
            duration: duration,
            isPlaying: isPlaying,
          });
        }
      } catch (e) {
        debugLog("ERROR", "timeupdate error: " + e.message, "error");
      }
    }
  });
}, 500);
