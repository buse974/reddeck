/**
 * YouTube DJ Mixer - Player Module
 * Contrôles de lecture des players YouTube
 */

// Initialisation de l'API YouTube
function onYouTubeIframeAPIReady() {
  initializePlayers();
}

// Créer les players YouTube
function initializePlayers() {
  state.players.A = new YT.Player("playerA", {
    height: "100%",
    width: "100%",
    playerVars: {
      autoplay: 0,
      controls: 0,
      disablekb: 1,
      modestbranding: 1,
      rel: 0,
      showinfo: 0,
      fs: 0,
    },
    events: {
      onReady: () => onPlayerReady("A"),
      onStateChange: (e) => onPlayerStateChange("A", e),
    },
  });

  state.players.B = new YT.Player("playerB", {
    height: "100%",
    width: "100%",
    playerVars: {
      autoplay: 0,
      controls: 0,
      disablekb: 1,
      modestbranding: 1,
      rel: 0,
      showinfo: 0,
      fs: 0,
    },
    events: {
      onReady: () => onPlayerReady("B"),
      onStateChange: (e) => onPlayerStateChange("B", e),
    },
  });
}

// Callback quand un player est prêt
function onPlayerReady(deck) {
  updateVolume(deck);
}

// Callback quand l'état d'un player change
function onPlayerStateChange(deck, event) {
  const status = event.data;

  if (status === YT.PlayerState.PLAYING) {
    const wasAlreadyPlaying = state.isPlaying[deck];
    state.isPlaying[deck] = true;
    state.currentDeck = deck;

    // Mettre à jour le cursor seulement si c'est un nouveau démarrage
    if (!wasAlreadyPlaying) {
      const videoId = state.loadedTracks[deck];
      if (videoId) {
        const trackIndex = state.playlist.findIndex((t) => t.id === videoId);
        if (trackIndex !== -1 && trackIndex !== state.playlistIndex) {
          state.playlistIndex = trackIndex;
          updatePlaylistUI();
        }

        // Mode DJ Auto : si on est sur la dernière piste, lancer la recherche
        if (
          state.playlistMode === "dj" &&
          isAtLastTrack() &&
          !state.isFetchingAutoSuggestion
        ) {
          fetchAndAddAutoSuggestion();
        }
      }
    }

    updateDeckStatus(deck, "PLAYING");
    document.getElementById(`vinyl${deck}`).classList.add("spinning");
    document.getElementById(`overlay${deck}`).classList.add("hidden");
    document.getElementById(`play${deck}`).textContent = "⏸";
    document.getElementById(`play${deck}`).classList.add("playing");
  } else if (status === YT.PlayerState.PAUSED) {
    state.isPlaying[deck] = false;
    updateDeckStatus(deck, "PAUSED");
    document.getElementById(`vinyl${deck}`).classList.remove("spinning");
    document.getElementById(`play${deck}`).textContent = "▶";
    document.getElementById(`play${deck}`).classList.remove("playing");
  } else if (status === YT.PlayerState.ENDED) {
    state.isPlaying[deck] = false;
    updateDeckStatus(deck, "ENDED");
    document.getElementById(`vinyl${deck}`).classList.remove("spinning");
    document.getElementById(`overlay${deck}`).classList.remove("hidden");
    document.getElementById(`play${deck}`).textContent = "▶";
    document.getElementById(`play${deck}`).classList.remove("playing");

    // Auto-load next from playlist if auto-mix is enabled
    if (state.autoMix && !state.isCrossfading) {
      loadNextFromPlaylist(deck);
    }
  }
}

// Mettre à jour le statut du deck
function updateDeckStatus(deck, status) {
  const statusEl = document.getElementById(`status${deck}`);
  statusEl.textContent = status;
  statusEl.className = "deck-status" + (status === "PLAYING" ? " playing" : "");
}

// Play/Pause un deck
function playDeck(deck) {
  const player = state.players[deck];
  const btn = document.getElementById("play" + deck);

  if (state.isPlaying[deck]) {
    if (isTvConnected()) {
      sendToTv({ type: "pause", deck: deck });
    } else if (player && typeof player.pauseVideo === "function") {
      player.pauseVideo();
    }
    state.isPlaying[deck] = false;
    if (btn) {
      btn.textContent = "▶";
      btn.classList.remove("playing");
    }
  } else {
    if (isTvConnected()) {
      sendToTv({ type: "play", deck: deck });
      sendToTv({ type: "switch", deck: deck });
    } else if (player && typeof player.playVideo === "function") {
      player.playVideo();
    }
    state.currentDeck = deck;
    state.isPlaying[deck] = true;
    if (btn) {
      btn.textContent = "⏸";
      btn.classList.add("playing");
    }
  }
}

// Arrêter un deck
function stopDeck(deck) {
  if (isTvConnected()) {
    sendToTv({ type: "pause", deck: deck });
  } else {
    const player = state.players[deck];
    if (!player || typeof player.stopVideo !== "function") return;
    player.stopVideo();
  }

  state.isPlaying[deck] = false;
  updateDeckStatus(deck, "STOPPED");
  document.getElementById(`vinyl${deck}`).classList.remove("spinning");
  document.getElementById(`play${deck}`).textContent = "▶";
  document.getElementById(`play${deck}`).classList.remove("playing");
}

// Cue (retour au début)
function cueDeck(deck) {
  const player = state.players[deck];
  if (!player || typeof player.seekTo !== "function") return;

  player.seekTo(0, true);
  player.pauseVideo();
}

// Seek depuis la waveform
function seekFromWaveform(deck, event) {
  const player = state.players[deck];
  const duration =
    state.durations[deck] ||
    (player && player.getDuration ? player.getDuration() : 0);
  if (!duration || duration <= 0) return;

  const waveform = event.currentTarget;
  const rect = waveform.getBoundingClientRect();
  const clickX = event.clientX - rect.left;
  const percentage = clickX / rect.width;

  const seekTime = duration * percentage;

  if (isTvConnected()) {
    sendToTv({
      type: "seek",
      deck: deck,
      time: seekTime,
    });
  } else if (player && typeof player.seekTo === "function") {
    player.seekTo(seekTime, true);
  }
}

// Charger une vidéo sur un deck
function loadVideo(deck, videoId, title = "Chargement...") {
  const player = state.players[deck];
  if (!player || typeof player.loadVideoById !== "function") return;

  state.loadedTracks[deck] = videoId;

  // Si TV connectée, ne charger que sur TV
  if (isTvConnected()) {
    sendToTv({
      type: "load",
      deck: deck,
      videoId: videoId,
      startTime: 0,
    });
  } else {
    player.loadVideoById(videoId);
  }

  updatePlaylistItemStyles();

  // Update track info
  const trackTitle = document.querySelector(`#trackInfo${deck} .track-title`);
  const trackArtist = document.querySelector(`#trackInfo${deck} .track-artist`);
  if (trackTitle) trackTitle.textContent = title;
  if (trackArtist) trackArtist.textContent = "YouTube";

  // Update thumbnail
  const thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  const trackThumb = document.getElementById(`trackThumbnail${deck}`);
  const videoThumb = document.getElementById(`videoThumbnail${deck}`);
  if (trackThumb) trackThumb.src = thumbnail;
  if (videoThumb) videoThumb.src = thumbnail;

  // Hide overlay when video loads
  const overlay = document.getElementById(`overlay${deck}`);
  if (overlay) {
    setTimeout(() => {
      overlay.classList.add("hidden");
    }, 1000);
  }
}

// Cue une vidéo (charger sans lancer)
function cueVideo(deck, videoId, title = "Chargement...") {
  const player = state.players[deck];
  if (!player || typeof player.cueVideoById !== "function") return;

  player.cueVideoById(videoId);
  state.loadedTracks[deck] = videoId;

  // Update track info
  document.querySelector(`#trackInfo${deck} .track-title`).textContent = title;
  document.querySelector(`#trackInfo${deck} .track-artist`).textContent =
    "YouTube";

  // Update thumbnail
  const thumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  document.getElementById(`trackThumbnail${deck}`).src = thumbnail;
  document.getElementById(`videoThumbnail${deck}`).src = thumbnail;

  updatePlaylistItemStyles();
}

// Charger une vidéo sur un deck depuis la recherche/playlist
async function loadToDeck(deck, videoId, title = "Vidéo YouTube") {
  loadVideo(deck, videoId, title);

  // Ajouter à la playlist intelligemment
  const track = {
    id: videoId,
    title: title,
    thumbnail: `https://img.youtube.com/vi/${videoId}/default.jpg`,
    duration: null,
  };

  // Vérifier si la piste est déjà dans la playlist
  const existingIndex = state.playlist.findIndex((t) => t.id === videoId);
  if (existingIndex !== -1) {
    updatePlaylistUI();
    return;
  }

  let insertedIndex;
  if (state.playlist.length === 0) {
    state.playlist.push(track);
    state.playlistIndex = 0;
    insertedIndex = 0;
  } else {
    insertedIndex = state.playlistIndex + 1;
    state.playlist.splice(insertedIndex, 0, track);
  }

  updatePlaylistUI();

  // Récupérer la durée en arrière-plan
  const duration = await fetchVideoDuration(videoId);
  if (duration && state.playlist[insertedIndex]?.id === videoId) {
    state.playlist[insertedIndex].duration = duration;
    updatePlaylistUI();
  }
}

// Reset l'affichage du temps
function resetTimeDisplay(deck) {
  document.getElementById(`timeCurrent${deck}`).textContent = "0:00";
  document.getElementById(`timeRemaining${deck}`).textContent = "-0:00";
  document.getElementById(`waveformProgress${deck}`).style.width = "0%";
  updateVUMeter(deck, 0);
}

// Mise à jour de l'affichage du temps
function updateTimeDisplay(deck) {
  // En mode TV, les mises à jour viennent de la TV
  if (isTvConnected()) return;

  const player = state.players[deck];
  if (!player || typeof player.getCurrentTime !== "function") return;

  try {
    const currentTime = player.getCurrentTime() || 0;
    const duration = player.getDuration() || 0;
    const remaining = duration - currentTime;

    document.getElementById(`timeCurrent${deck}`).textContent =
      formatTime(currentTime);
    document.getElementById(`timeRemaining${deck}`).textContent =
      "-" + formatTime(remaining);

    // Update waveform progress
    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
    document.getElementById(`waveformProgress${deck}`).style.width =
      progress + "%";

    // Update waveform cursor position
    const cursor = document.getElementById(`waveformCursor${deck}`);
    if (cursor) {
      cursor.style.left = progress + "%";
    }

    // Update VU meter with some animation
    if (state.isPlaying[deck]) {
      const randomLevel = state.volumes[deck] * (0.7 + Math.random() * 0.3);
      updateVUMeter(deck, randomLevel * (state.volumes.master / 100));
    }
  } catch (e) {
    // Player not ready yet
  }
}

// Démarrer la boucle de mise à jour
function startUpdateLoop() {
  state.updateInterval = setInterval(() => {
    updateTimeDisplay("A");
    updateTimeDisplay("B");
    checkAutoTransition();
  }, 100);
}
