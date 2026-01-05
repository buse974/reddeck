/**
 * YouTube DJ Mixer - Mixer Module
 * Gestion du crossfader, volumes et transitions
 */

// Mettre à jour le volume d'un deck
function updateVolume(deck) {
  const player = state.players[deck];
  if (!player || typeof player.setVolume !== "function") return;

  const deckVolume = state.volumes[deck];
  const masterVolume = state.volumes.master / 100;

  // Calcul du volume basé sur le crossfader
  let crossfadeMultiplier = 1;
  if (deck === "A") {
    crossfadeMultiplier = 1 - state.crossfaderPosition / 100;
  } else {
    crossfadeMultiplier = state.crossfaderPosition / 100;
  }

  const finalVolume = Math.round(
    deckVolume * masterVolume * crossfadeMultiplier,
  );

  // Si TV connectée, couper le son du mixer (le son vient de la TV)
  if (isTvConnected()) {
    player.setVolume(0);
  } else {
    player.setVolume(finalVolume);
  }

  // Envoyer le volume à la TV
  sendToTv({ type: "volume", deck: deck, volume: finalVolume });

  // Update VU meter (fonction dans vu-meter.js)
  updateVUMeter(deck, state.isPlaying[deck] ? finalVolume : 0);
}

// Définir la position du crossfader
function setCrossfader(position) {
  state.crossfaderPosition = position;
  updateVolume("A");
  updateVolume("B");

  // Envoyer à la TV pour le fondu visuel
  sendToTv({ type: "crossfader", position: position });
}

// Démarrer un crossfade automatique
function startCrossfade(fromDeck, toDeck) {
  if (state.isCrossfading) return;

  state.isCrossfading = true;
  const duration = state.crossfadeDuration * 1000;

  // Envoyer le crossfade à la TV
  sendToTv({
    type: "crossfade",
    toDeck: toDeck,
    duration: state.crossfadeDuration,
  });

  const steps = 50;
  const stepDuration = duration / steps;

  const startPosition = fromDeck === "A" ? 0 : 100;
  const endPosition = toDeck === "A" ? 0 : 100;
  const positionChange = (endPosition - startPosition) / steps;

  let currentStep = 0;

  // Start playing the target deck
  if (isTvConnected()) {
    sendToTv({ type: "play", deck: toDeck });
  } else {
    const toPlayer = state.players[toDeck];
    if (toPlayer && typeof toPlayer.playVideo === "function") {
      toPlayer.playVideo();
    }
  }

  const crossfadeInterval = setInterval(() => {
    currentStep++;
    const newPosition = startPosition + positionChange * currentStep;

    document.getElementById("crossfader").value = newPosition;
    setCrossfader(newPosition);

    if (currentStep >= steps) {
      clearInterval(crossfadeInterval);
      state.isCrossfading = false;
      state.currentDeck = toDeck;

      // Mettre à jour le cursor sur la piste qui joue maintenant
      const videoId = state.loadedTracks[toDeck];
      if (videoId) {
        const trackIndex = state.playlist.findIndex((t) => t.id === videoId);
        if (trackIndex !== -1) {
          state.playlistIndex = trackIndex;
        }
      }

      // Stop the previous deck
      stopDeck(fromDeck);

      // Précharger la piste suivante
      preloadNextTrack(fromDeck);

      // Mettre à jour l'UI de la playlist
      updatePlaylistUI();
    }
  }, stepDuration);
}

// Passer à la piste suivante avec mix auto
function nextTrack() {
  if (state.isCrossfading) return;

  const activeDeck = state.currentDeck;
  const otherDeck = activeDeck === "A" ? "B" : "A";

  // Si l'autre deck a déjà une piste chargée, lancer le crossfade
  if (state.loadedTracks[otherDeck]) {
    startCrossfade(activeDeck, otherDeck);
  } else {
    // Sinon charger la piste suivante puis crossfade
    loadNextFromPlaylist(otherDeck);
    // Attendre un peu que la piste soit chargée puis crossfade
    setTimeout(() => {
      if (state.loadedTracks[otherDeck]) {
        startCrossfade(activeDeck, otherDeck);
      }
    }, 500);
  }
}

// Vérifier si une transition automatique est nécessaire
function checkAutoTransition() {
  if (!state.autoMix || state.isCrossfading) return;

  const activeDeck = state.currentDeck;
  if (!state.isPlaying[activeDeck]) return;

  let currentTime, duration;

  if (isTvConnected()) {
    currentTime = state.currentTimes[activeDeck] || 0;
    duration = state.durations[activeDeck] || 0;
  } else {
    const player = state.players[activeDeck];
    if (!player || typeof player.getCurrentTime !== "function") return;
    currentTime = player.getCurrentTime();
    duration = player.getDuration();
  }

  if (!duration || duration <= 0) return;
  const timeRemaining = duration - currentTime;

  // Déclencher le crossfade X secondes avant la fin
  if (timeRemaining <= state.crossfadeDuration && timeRemaining > 0) {
    const otherDeck = activeDeck === "A" ? "B" : "A";

    if (state.loadedTracks[otherDeck]) {
      startCrossfade(activeDeck, otherDeck);
    } else {
      loadNextFromPlaylist(otherDeck);
    }
  }
}
