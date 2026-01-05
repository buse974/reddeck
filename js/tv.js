/**
 * YouTube DJ Mixer - TV Module
 * Communication avec la fenêtre TV via BroadcastChannel
 */

// BroadcastChannel pour la communication TV
const tvChannel = new BroadcastChannel("dj-karaoke");
let tvConnected = false;
let tvWindow = null;

// Initialisation des listeners TV
tvChannel.onmessage = (event) => {
  const data = event.data;

  if (data.type === "karaoke-ready") {
    tvConnected = true;
    updateTvButton();
    syncTv();
  }

  if (data.type === "request-sync") {
    tvConnected = true;
    updateTvButton();
    syncTv();
  }

  if (data.type === "karaoke-closed") {
    tvConnected = false;
    updateTvButton();
  }

  if (data.type === "duration") {
    state.durations[data.deck] = data.duration;
  }

  if (data.type === "timeupdate") {
    state.durations[data.deck] = data.duration;
    state.currentTimes[data.deck] = data.currentTime;
    state.isPlaying[data.deck] = data.isPlaying;

    // Mettre à jour le deck actif basé sur quel deck joue
    if (data.isPlaying) {
      state.currentDeck = data.deck;
    }

    // Mettre à jour le statut du deck
    updateDeckStatus(data.deck, data.isPlaying ? "PLAYING" : "PAUSED");

    // Mettre à jour le vinyle
    const vinyl = document.getElementById(`vinyl${data.deck}`);
    if (vinyl) {
      vinyl.classList.toggle("spinning", data.isPlaying);
    }

    updateTimeDisplayFromTv(data.deck, data.currentTime, data.duration);
    const btn = document.getElementById("play" + data.deck);
    if (btn) {
      btn.textContent = data.isPlaying ? "⏸" : "▶";
      btn.classList.toggle("playing", data.isPlaying);
    }
  }
};

// Mettre à jour l'affichage du temps depuis TV
function updateTimeDisplayFromTv(deck, currentTime, duration) {
  const timeCurrentEl = document.getElementById(`timeCurrent${deck}`);
  const timeRemainingEl = document.getElementById(`timeRemaining${deck}`);
  const waveformProgress = document.getElementById(`waveformProgress${deck}`);
  const waveformCursor = document.getElementById(`waveformCursor${deck}`);

  if (timeCurrentEl) {
    timeCurrentEl.textContent = formatTime(currentTime);
  }
  if (timeRemainingEl) {
    timeRemainingEl.textContent = "-" + formatTime(duration - currentTime);
  }
  if (duration > 0) {
    const progress = (currentTime / duration) * 100;
    if (waveformProgress) {
      waveformProgress.style.width = progress + "%";
    }
    if (waveformCursor) {
      waveformCursor.style.left = progress + "%";
    }
  }
}

// Synchroniser l'état avec la TV
function syncTv() {
  if (!tvConnected) return;

  const playerA = state.players.A;
  const playerB = state.players.B;

  const deckAState = {
    videoId: state.loadedTracks.A,
    currentTime: playerA?.getCurrentTime?.() || 0,
    volume: state.volumes.A,
    isPlaying: state.isPlaying.A,
  };

  const deckBState = {
    videoId: state.loadedTracks.B,
    currentTime: playerB?.getCurrentTime?.() || 0,
    volume: state.volumes.B,
    isPlaying: state.isPlaying.B,
  };

  // Déterminer le deck actif
  let activeDeck = "A";
  if (state.isPlaying.B && !state.isPlaying.A) {
    activeDeck = "B";
  } else if (state.isPlaying.B && state.isPlaying.A) {
    activeDeck = state.volumes.B > state.volumes.A ? "B" : "A";
  }

  tvChannel.postMessage({
    type: "sync",
    deckA: deckAState,
    deckB: deckBState,
    activeDeck: activeDeck,
    crossfaderPosition: state.crossfaderPosition,
    masterVolume: state.volumes.master,
  });
}

// Envoyer un message à la TV
function sendToTv(message) {
  if (tvConnected) {
    tvChannel.postMessage(message);
  }
}

// Mettre à jour le bouton TV
function updateTvButton() {
  const btn = document.getElementById("btnKaraoke");
  if (btn) {
    btn.classList.toggle("connected", tvConnected);
    btn.title = tvConnected ? "TV connectée" : "Ouvrir fenêtre TV";
  }

  // Cacher/afficher les players vidéo du mixer
  const videoA = document.getElementById("playerA");
  const videoB = document.getElementById("playerB");
  const overlayA = document.getElementById("overlayA");
  const overlayB = document.getElementById("overlayB");

  if (tvConnected) {
    // Mode TV: cacher les vidéos, afficher un message
    if (videoA) videoA.style.opacity = "0";
    if (videoB) videoB.style.opacity = "0";
    if (overlayA) {
      overlayA.classList.remove("hidden");
      overlayA.innerHTML = '<div class="tv-mode-message">TV</div>';
    }
    if (overlayB) {
      overlayB.classList.remove("hidden");
      overlayB.innerHTML = '<div class="tv-mode-message">TV</div>';
    }
  } else {
    // Mode normal: afficher les vidéos
    if (videoA) videoA.style.opacity = "1";
    if (videoB) videoB.style.opacity = "1";
  }
}

// Ouvrir/fermer la fenêtre TV
function openTvWindow() {
  // Si la fenêtre est déjà ouverte et connectée, la fermer
  if (tvConnected && tvWindow && !tvWindow.closed) {
    closeTvAndRestoreLocal();
    return;
  }

  // Si la fenêtre est ouverte mais pas connectée, juste la focus
  if (tvWindow && !tvWindow.closed) {
    tvWindow.focus();
    return;
  }

  // Sinon ouvrir une nouvelle fenêtre
  tvWindow = window.open("tv.html", "tv", "width=1280,height=720");
  if (tvWindow) {
    tvWindow.focus();
  }
}

// Fermer la TV et restaurer les players locaux
function closeTvAndRestoreLocal() {
  // Sauvegarder les vidéos chargées et leur position
  const tracksToRestore = {
    A: {
      videoId: state.loadedTracks.A,
      time: state.currentTimes.A,
      isPlaying: state.isPlaying.A,
    },
    B: {
      videoId: state.loadedTracks.B,
      time: state.currentTimes.B,
      isPlaying: state.isPlaying.B,
    },
  };

  // Fermer la fenêtre TV
  if (tvWindow && !tvWindow.closed) {
    tvWindow.close();
  }
  tvWindow = null;
  tvConnected = false;
  updateTvButton();

  // Recharger les vidéos dans les players locaux
  ["A", "B"].forEach((deck) => {
    const track = tracksToRestore[deck];
    if (track.videoId) {
      const player = state.players[deck];
      if (player && typeof player.loadVideoById === "function") {
        player.loadVideoById({
          videoId: track.videoId,
          startSeconds: track.time || 0,
        });
        // Restaurer l'état play/pause après un délai
        setTimeout(() => {
          if (track.isPlaying && player.playVideo) {
            player.playVideo();
          }
        }, 1000);
      }
    }
  });
}

// Vérifier si la TV est connectée
function isTvConnected() {
  return tvConnected;
}
