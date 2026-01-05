/**
 * YouTube DJ Mixer - Suggestions Module
 * Fetches and displays similar tracks using Last.fm and YouTube.
 */

/**
 * Fetch suggestions depuis Last.fm avec fallbacks
 * Note: searchYouTubeForSuggestion est définie dans playlist.js
 */
async function fetchSuggestions() {
  const container = document.getElementById("suggestionsContainer");

  if (state.playlist.length === 0) {
    container.innerHTML = `
      <div class="suggestions-empty">
        <p>Ajoutez des pistes à votre playlist pour obtenir des suggestions</p>
      </div>
    `;
    return;
  }

  const currentTrack = state.playlist[state.playlistIndex];
  if (!currentTrack || !currentTrack.title) {
    container.innerHTML = `
      <div class="suggestions-empty">
        <p>Aucune piste sélectionnée</p>
      </div>
    `;
    document.getElementById("suggestionSourceTitle").textContent = "-";
    return;
  }

  const trackTitle = currentTrack.title;
  document.getElementById("suggestionSourceTitle").textContent = trackTitle;

  container.innerHTML = `
    <div class="suggestions-loading">
      <div class="loader"></div>
      <p>Analyse du titre...</p>
    </div>
  `;

  // Extraire artiste et titre avec la fonction de lastfm.js
  const extracted = parseTrackTitle(trackTitle);
  const artist = extracted.artist;
  const title = extracted.title;

  if (!artist) {
    container.innerHTML = `
      <div class="suggestions-empty">
        <p>Impossible d'extraire l'artiste du titre</p>
        <p class="hint">Format attendu: "Artiste - Titre"</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="suggestions-loading">
      <div class="loader"></div>
      <p>Recherche Last.fm pour ${artist}...</p>
    </div>
  `;

  try {
    // Récupérer les suggestions Last.fm
    const lastFmSuggestions = await fetchLastFmSuggestions(artist, title);

    if (lastFmSuggestions.length === 0) {
      container.innerHTML = `
        <div class="suggestions-empty">
          <p>Aucune suggestion trouvée sur Last.fm</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="suggestions-loading">
        <div class="loader"></div>
        <p>Recherche sur YouTube (0/${Math.min(lastFmSuggestions.length, 12)})...</p>
      </div>
    `;

    // Convertir en vidéos YouTube
    const suggestions = [];
    const playlistIds = state.playlist.map((t) => t.id);
    let processed = 0;

    for (const track of lastFmSuggestions.slice(0, 12)) {
      const youtubeResult = await searchYouTubeForSuggestion(
        track.artist,
        track.title,
      );
      processed++;

      container.querySelector("p").textContent =
        `Recherche sur YouTube (${processed}/${Math.min(lastFmSuggestions.length, 12)})...`;

      if (youtubeResult && !playlistIds.includes(youtubeResult.id)) {
        // Éviter les doublons dans les suggestions
        if (!suggestions.some((s) => s.id === youtubeResult.id)) {
          suggestions.push(youtubeResult);
        }
      }

      // Arrêter si on a assez de suggestions
      if (suggestions.length >= 10) break;
    }

    if (suggestions.length === 0) {
      container.innerHTML = `
        <div class="suggestions-empty">
          <p>Aucune vidéo correspondante trouvée sur YouTube</p>
        </div>
      `;
      return;
    }

    displaySuggestions(suggestions);
  } catch (error) {
    console.error("Erreur suggestions:", error);
    container.innerHTML = `
      <div class="suggestions-empty">
        <p>Erreur lors de la recherche</p>
      </div>
    `;
  }
}

/**
 * Affiche les suggestions dans l'UI
 */
function displaySuggestions(suggestions) {
  const container = document.getElementById("suggestionsContainer");

  let html = "";
  suggestions.forEach((suggestion) => {
    const title = suggestion.title.replace(/'/g, "\\'").replace(/"/g, "&quot;");
    html += `
      <div class="suggestion-item" data-video-id="${suggestion.id}">
        <img class="suggestion-thumb" src="${suggestion.thumbnail}" alt="">
        <div class="suggestion-info">
          <div class="suggestion-title">${suggestion.title}</div>
          <div class="suggestion-channel">${suggestion.channel}</div>
        </div>
        <button class="btn-add-suggestion" onclick="addSuggestionToPlaylist('${suggestion.id}', '${title}')" title="Ajouter à la playlist">+</button>
      </div>
    `;
  });

  container.innerHTML = html;
}

/**
 * Ajoute une suggestion à la playlist
 */
function addSuggestionToPlaylist(videoId, title) {
  addToPlaylist(videoId, title);

  const item = document.querySelector(
    `.suggestion-item[data-video-id="${videoId}"]`,
  );
  if (item) {
    item.classList.add("added");
    setTimeout(() => item.remove(), 300);
  }
}

/**
 * Toggle le panneau suggestions
 */
function toggleSuggestionsPanel() {
  const panel = document.getElementById("suggestionsPanel");
  const wasActive = panel.classList.contains("active");
  panel.classList.toggle("active");

  if (!wasActive && panel.classList.contains("active")) {
    fetchSuggestions();
  }
}

/**
 * Ferme le panneau suggestions
 */
function closeSuggestionsPanel() {
  document.getElementById("suggestionsPanel").classList.remove("active");
}

/**
 * Récupère les suggestions pour une piste spécifique
 */
function getSuggestionsForTrack(index) {
  state.playlistIndex = index;
  const panel = document.getElementById("suggestionsPanel");
  if (!panel.classList.contains("active")) {
    panel.classList.add("active");
  }
  fetchSuggestions();
}
