/**
 * YouTube DJ Mixer - Playlist Module
 * Gestion de la playlist
 */

// Afficher le champ d'ajout par URL
function showAddUrlInput() {
  const container = document.getElementById("playlistUrlInput");
  if (container) {
    container.style.display = "flex";
    const input = document.getElementById("urlInputField");
    if (input) {
      input.value = "";
      input.focus();
    }
  }
}

// Cacher le champ d'ajout par URL
function hideAddUrlInput() {
  const container = document.getElementById("playlistUrlInput");
  if (container) {
    container.style.display = "none";
  }
}

// Ajouter une vidéo via URL/ID
async function addUrlToPlaylist() {
  const input = document.getElementById("urlInputField");
  if (!input) return;

  const value = input.value.trim();
  if (!value) return;

  // Extraire l'ID de la vidéo (fonction dans youtube.js)
  const videoId = extractVideoId(value);
  if (!videoId) {
    alert("Lien ou ID YouTube invalide");
    return;
  }

  // Vérifier si déjà dans la playlist
  if (state.playlist.some((t) => t.id === videoId)) {
    alert("Cette vidéo est déjà dans la playlist");
    return;
  }

  // Ajouter à la playlist
  await addToPlaylist(videoId, "Chargement...");

  // Récupérer le titre via l'API (si clé dispo)
  if (apiKeys && apiKeys.length > 0) {
    try {
      const response = await fetchWithApiKey(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=API_KEY`,
      );
      const data = await response.json();
      if (data.items && data.items.length > 0) {
        const title = data.items[0].snippet.title;
        const trackIndex = state.playlist.findIndex((t) => t.id === videoId);
        if (trackIndex !== -1) {
          state.playlist[trackIndex].title = title;
          updatePlaylistUI();
        }
      }
    } catch (e) {
      // Ignorer l'erreur, garder le titre par défaut
    }
  }

  hideAddUrlInput();
}

// Ajouter une piste à la playlist
async function addToPlaylist(videoId, title = null) {
  const track = {
    id: videoId,
    title: title || `Vidéo ${videoId.substring(0, 8)}...`,
    thumbnail: `https://img.youtube.com/vi/${videoId}/default.jpg`,
    duration: null,
  };

  state.playlist.push(track);
  updatePlaylistUI();

  // Récupérer la durée en arrière-plan
  const duration = await fetchVideoDuration(videoId);
  if (duration) {
    const trackIndex = state.playlist.findIndex((t) => t.id === videoId);
    if (trackIndex !== -1) {
      state.playlist[trackIndex].duration = duration;
      updatePlaylistUI();
    }
  }

  // Si c'est la première piste et que rien ne joue, la charger sur Deck A
  if (state.playlist.length === 1 && !state.isPlaying.A && !state.isPlaying.B) {
    cueVideo("A", videoId, track.title);
  }

  // Si seulement 2 pistes et Deck B est vide, charger sur Deck B
  if (state.playlist.length === 2) {
    cueVideo("B", state.playlist[1].id, state.playlist[1].title);
  }
}

// Supprimer une piste de la playlist
function removeFromPlaylist(index) {
  state.playlist.splice(index, 1);
  if (state.playlistIndex >= state.playlist.length) {
    state.playlistIndex = 0;
  }
  updatePlaylistUI();
}

// Vider la playlist
function clearPlaylist() {
  state.playlist = [];
  state.playlistIndex = 0;
  updatePlaylistUI();
}

// Charger la prochaine piste de la playlist
async function loadNextFromPlaylist(deck) {
  if (state.playlist.length === 0) return;

  // Mode DJ intelligent : si on est à la dernière piste, chercher une suggestion
  if (state.playlistMode === "dj" && isAtLastTrack()) {
    const added = await fetchAndAddAutoSuggestion();
    if (added) {
      // Une nouvelle piste a été ajoutée, charger la suivante
      const nextIndex = state.playlistIndex + 1;
      const nextTrack = state.playlist[nextIndex];
      if (nextTrack) {
        loadVideo(deck, nextTrack.id, nextTrack.title);
        return;
      }
    }
    // Si pas de suggestion trouvée, on boucle quand même
  }

  // Mode repeat ou fallback : boucler
  const nextIndex = (state.playlistIndex + 1) % state.playlist.length;
  const nextTrack = state.playlist[nextIndex];

  if (nextTrack) {
    loadVideo(deck, nextTrack.id, nextTrack.title);
  }
}

// Précharger la prochaine piste
function preloadNextTrack(deck) {
  if (state.playlist.length === 0) return;

  const nextIndex = (state.playlistIndex + 1) % state.playlist.length;
  const nextTrack = state.playlist[nextIndex];

  if (nextTrack) {
    cueVideo(deck, nextTrack.id, nextTrack.title);
  }
}

// Définir l'index de la playlist
function setPlaylistIndex(index) {
  if (index < 0 || index >= state.playlist.length) return;
  state.playlistIndex = index;

  const inactiveDeck = state.isPlaying.A ? "B" : state.isPlaying.B ? "A" : "A";
  preloadNextTrack(inactiveDeck);

  updatePlaylistUI();
}

// Réordonner la playlist
function reorderPlaylist(draggedIndex, targetIndex) {
  const [item] = state.playlist.splice(draggedIndex, 1);
  state.playlist.splice(targetIndex, 0, item);
  updatePlaylistUI();
}

// Déplacer un item dans la playlist
function movePlaylistItem(index, direction) {
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= state.playlist.length) return;

  const [item] = state.playlist.splice(index, 1);
  state.playlist.splice(newIndex, 0, item);
  updatePlaylistUI();
}

// Toggle mode playlist (repeat / dj intelligent)
function togglePlaylistMode() {
  const toggle = document.getElementById("djModeToggle");
  if (toggle.checked) {
    state.playlistMode = "dj";
  } else {
    state.playlistMode = "repeat";
  }
  // Sauvegarder le mode
  localStorage.setItem("dj_playlist_mode", state.playlistMode);
}

// Charger le mode depuis localStorage
function loadPlaylistMode() {
  const savedMode = localStorage.getItem("dj_playlist_mode");
  const toggle = document.getElementById("djModeToggle");
  if (savedMode === "dj") {
    state.playlistMode = "dj";
    if (toggle) {
      toggle.checked = true;
    }
  }
}

// Vérifie si on est à la dernière piste et doit chercher une suggestion
function isAtLastTrack() {
  return state.playlistIndex >= state.playlist.length - 1;
}

// Affiche/met à jour la fake piste DJ Auto
function showDjAutoStatus(message, status = "searching", data = {}) {
  let fakeItem = document.getElementById("djAutoFakeItem");
  let isNew = false;

  if (!fakeItem) {
    isNew = true;
    fakeItem = document.createElement("div");
    fakeItem.id = "djAutoFakeItem";
    fakeItem.className = "dj-auto-status-bar";
    const statusContainer = document.getElementById("djAutoStatusContainer");
    if (statusContainer) {
      statusContainer.appendChild(fakeItem);
    }
  }

  // Classes selon le statut
  fakeItem.className = `dj-auto-status-bar status-${status}`;

  // Icône selon le statut
  let icon = "";
  let progressBar = "";

  if (status === "searching") {
    icon = `<div class="dj-auto-spinner"></div>`;
    if (data.progress && data.total) {
      const percent = Math.round((data.progress / data.total) * 100);
      progressBar = `<div class="dj-auto-progress"><div class="dj-auto-progress-fill" style="width: ${percent}%"></div></div>`;
    }
  } else if (status === "success") {
    icon = `<div class="dj-auto-icon success">&#10003;</div>`;
  } else if (status === "error") {
    icon = `<div class="dj-auto-icon error">&#10007;</div>`;
  }

  // Badge étape
  let stepBadge = "";
  if (data.step === "lastfm") {
    stepBadge = `<span class="dj-auto-badge lastfm">Last.fm</span>`;
  } else if (data.step === "youtube") {
    stepBadge = `<span class="dj-auto-badge youtube">YouTube</span>`;
  }

  fakeItem.innerHTML = `
    <div class="dj-auto-content">
      ${icon}
      <div class="dj-auto-info">
        <div class="dj-auto-header">
          <span class="dj-auto-label">DJ AUTO</span>
          ${stepBadge}
        </div>
        <div class="dj-auto-message">${message}</div>
        ${progressBar}
      </div>
    </div>
  `;

  // Scroll en bas si nouveau
  if (isNew) {
    const container = document.getElementById("playlistContainer");
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }
}

// Cache la fake piste DJ Auto
function hideDjAutoStatus() {
  const fakeItem = document.getElementById("djAutoFakeItem");
  if (fakeItem) {
    fakeItem.remove();
  }
}

// Récupère et ajoute une suggestion automatiquement (mode DJ)
async function fetchAndAddAutoSuggestion() {
  if (state.isFetchingAutoSuggestion) return false;
  if (state.playlist.length === 0) return false;

  state.isFetchingAutoSuggestion = true;

  try {
    // Construire la liste des pistes à essayer (de la dernière à la première)
    const tracksToTry = [];
    for (let i = state.playlist.length - 1; i >= 0; i--) {
      const track = state.playlist[i];
      if (track && track.title) {
        const extracted = parseTrackTitle(track.title);
        if (extracted.artist) {
          tracksToTry.push({ track, extracted, index: i });
        }
      }
    }

    if (tracksToTry.length === 0) {
      showDjAutoStatus("Aucun artiste identifiable", "error");
      setTimeout(hideDjAutoStatus, 3000);
      state.isFetchingAutoSuggestion = false;
      return false;
    }

    const playlistIds = state.playlist.map((t) => t.id);
    const playlistTitles = state.playlist.map((t) => t.title);

    // Essayer chaque piste jusqu'à trouver une suggestion valide
    for (let t = 0; t < tracksToTry.length; t++) {
      const { track, extracted } = tracksToTry[t];
      const sourceInfo =
        t === 0
          ? extracted.artist
          : `${extracted.artist} (piste ${tracksToTry[t].index + 1})`;

      showDjAutoStatus(`Recherche Last.fm: ${sourceInfo}`, "searching", {
        artist: extracted.artist,
        step: "lastfm",
      });

      const suggestions = await fetchLastFmSuggestions(
        extracted.artist,
        extracted.title,
      );

      if (suggestions.length === 0) {
        continue;
      }

      // Limiter à 5 suggestions max pour économiser les appels YouTube
      const maxSuggestions = Math.min(suggestions.length, 5);

      showDjAutoStatus(`${maxSuggestions} suggestions...`, "searching", {
        artist: extracted.artist,
        count: maxSuggestions,
        step: "youtube",
      });

      const maxToTry = Math.min(suggestions.length, 5);

      // Essayer les suggestions
      for (let i = 0; i < maxToTry; i++) {
        const suggestion = suggestions[i];

        showDjAutoStatus(
          `${suggestion.artist} - ${suggestion.title}`,
          "searching",
          {
            artist: suggestion.artist,
            title: suggestion.title,
            progress: i + 1,
            total: maxToTry,
            step: "youtube",
          },
        );

        const youtubeResult = await searchYouTubeForSuggestion(
          suggestion.artist,
          suggestion.title,
        );

        // Si pas de résultat ou ID déjà dans la playlist, essayer la suggestion suivante
        if (!youtubeResult || playlistIds.includes(youtubeResult.id)) {
          continue;
        }

        // Trouvé ! Ajouter à la playlist et précharger
        showDjAutoStatus(
          `${suggestion.artist} - ${suggestion.title}`,
          "success",
        );

        // Ajouter à la fin de la playlist
        state.playlist.push({
          id: youtubeResult.id,
          title: youtubeResult.title,
          thumbnail: youtubeResult.thumbnail,
          duration: null,
        });
        updatePlaylistUI();

        // Précharger sur le deck opposé au deck actif
        const inactiveDeck = state.currentDeck === "A" ? "B" : "A";
        cueVideo(inactiveDeck, youtubeResult.id, youtubeResult.title);

        setTimeout(hideDjAutoStatus, 1500);
        state.isFetchingAutoSuggestion = false;
        return true;
      }
    }

    // Aucune suggestion trouvée après avoir essayé toutes les pistes
    showDjAutoStatus("Aucune suggestion disponible", "error");
    setTimeout(hideDjAutoStatus, 3000);
    state.isFetchingAutoSuggestion = false;
    return false;
  } catch (error) {
    console.error("DJ Auto: erreur", error);
    showDjAutoStatus(error.message, "error");
    setTimeout(hideDjAutoStatus, 3000);
    state.isFetchingAutoSuggestion = false;
    return false;
  }
}

// Ajouter un mix (top tracks d'un genre) à la playlist
async function addMixToPlaylist(genre) {
  // Fermer le menu
  const menu = document.getElementById("suggestionMenu");
  if (menu) menu.classList.remove("active");

  if (state.isFetchingAutoSuggestion) return;
  state.isFetchingAutoSuggestion = true;

  showDjAutoStatus(`Mix ${genre}...`, "searching", { step: "lastfm" });

  try {
    const playlistIds = state.playlist.map((t) => t.id);

    // Récupérer les top tracks du genre via Last.fm
    const url = `https://ws.audioscrobbler.com/2.0/?method=tag.gettoptracks&tag=${encodeURIComponent(genre)}&api_key=${LASTFM_API_KEY}&format=json&limit=30`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data.tracks || !data.tracks.track) {
      showDjAutoStatus("Aucun résultat", "error");
      setTimeout(hideDjAutoStatus, 2000);
      state.isFetchingAutoSuggestion = false;
      return;
    }

    const tracks = data.tracks.track;
    let added = 0;

    for (const track of tracks) {
      if (added >= 10) break;

      showDjAutoStatus(`${track.artist.name} - ${track.name}`, "searching", {
        step: "youtube",
      });

      const youtubeResult = await searchYouTubeForSuggestion(
        track.artist.name,
        track.name,
      );

      if (youtubeResult && !playlistIds.includes(youtubeResult.id)) {
        state.playlist.push({
          id: youtubeResult.id,
          title: youtubeResult.title,
          thumbnail: youtubeResult.thumbnail,
          duration: null,
        });
        playlistIds.push(youtubeResult.id);
        added++;
        updatePlaylistUI();
      }
    }

    if (added > 0) {
      showDjAutoStatus(`${added} titres ajoutés`, "success");
    } else {
      showDjAutoStatus("Aucun titre trouvé", "error");
    }
    setTimeout(hideDjAutoStatus, 2000);
  } catch (e) {
    console.error("Erreur mix:", e);
    showDjAutoStatus("Erreur", "error");
    setTimeout(hideDjAutoStatus, 2000);
  }

  state.isFetchingAutoSuggestion = false;
}

// Toggle menu (générique)
function toggleMenu(menuId, event) {
  event.stopPropagation();

  // Fermer tous les autres menus
  document.querySelectorAll(".suggestion-menu.active").forEach((m) => {
    if (m.id !== menuId) m.classList.remove("active");
  });

  const menu = document.getElementById(menuId);
  menu.classList.toggle("active");

  const closeMenu = (e) => {
    if (!e.target.closest(".playlist-add-suggestion-wrapper")) {
      menu.classList.remove("active");
      document.removeEventListener("click", closeMenu);
    }
  };

  if (menu.classList.contains("active")) {
    setTimeout(() => document.addEventListener("click", closeMenu), 0);
  }
}

function toggleSuggestionMenu(event) {
  toggleMenu("suggestionMenu", event);
}

function toggleMixMenu(event) {
  toggleMenu("mixMenu", event);
}

// Ajouter une suggestion auto à la playlist (bouton + en bas)
// type: 'similar' (titre similaire), 'artist' (même artiste), 'genre' (même genre)
async function addAutoSuggestion(type = "similar") {
  if (state.isFetchingAutoSuggestion) return;
  if (state.playlist.length === 0) return;

  // Fermer le menu
  const menu = document.getElementById("suggestionMenu");
  if (menu) menu.classList.remove("active");

  state.isFetchingAutoSuggestion = true;

  const typeLabels = {
    similar: "Similaire",
    artist: "Même artiste",
    genre: "Même genre",
  };
  showDjAutoStatus(`${typeLabels[type]}...`, "searching", { step: "lastfm" });

  try {
    const playlistIds = state.playlist.map((t) => t.id);

    // Prendre la dernière piste comme référence
    for (let i = state.playlist.length - 1; i >= 0; i--) {
      const track = state.playlist[i];
      if (!track || !track.title) continue;

      const extracted = parseTrackTitle(track.title);
      if (!extracted.artist) continue;

      showDjAutoStatus(`${extracted.artist}...`, "searching", {
        step: "lastfm",
      });

      let suggestions = [];
      if (type === "similar") {
        suggestions = await fetchLastFmSuggestions(
          extracted.artist,
          extracted.title,
        );
      } else if (type === "artist") {
        suggestions = await fetchArtistTopTracks(extracted.artist);
      } else if (type === "genre") {
        suggestions = await fetchSameGenreTracks(extracted.artist);
      }

      if (suggestions.length === 0) continue;

      // Essayer les suggestions
      for (let j = 0; j < Math.min(suggestions.length, 5); j++) {
        const suggestion = suggestions[j];
        showDjAutoStatus(
          `${suggestion.artist} - ${suggestion.title}`,
          "searching",
          { step: "youtube" },
        );

        const youtubeResult = await searchYouTubeForSuggestion(
          suggestion.artist,
          suggestion.title,
        );

        if (youtubeResult && !playlistIds.includes(youtubeResult.id)) {
          state.playlist.push({
            id: youtubeResult.id,
            title: youtubeResult.title,
            thumbnail: youtubeResult.thumbnail,
            duration: null,
          });
          updatePlaylistUI();
          showDjAutoStatus(
            `${suggestion.artist} - ${suggestion.title}`,
            "success",
          );
          setTimeout(hideDjAutoStatus, 1500);
          state.isFetchingAutoSuggestion = false;
          return;
        }
      }
    }

    showDjAutoStatus("Aucune suggestion", "error");
    setTimeout(hideDjAutoStatus, 2000);
  } catch (e) {
    console.error("Erreur ajout suggestion:", e);
    showDjAutoStatus("Erreur", "error");
    setTimeout(hideDjAutoStatus, 2000);
  }

  state.isFetchingAutoSuggestion = false;
}

// Recherche YouTube pour une suggestion - retourne le premier résultat
async function searchYouTubeForSuggestion(artist, title) {
  const query = `${artist} ${title}`;

  try {
    const response = await fetchWithApiKey(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=1&type=video&q=${encodeURIComponent(query)}&key=API_KEY`,
    );

    const data = await response.json();
    if (data.items && data.items.length > 0) {
      const item = data.items[0];
      return {
        id: item.id.videoId,
        title: item.snippet.title,
        thumbnail:
          item.snippet.thumbnails?.medium?.url ||
          item.snippet.thumbnails?.default?.url,
        channel: item.snippet.channelTitle,
      };
    }
  } catch (e) {
    console.error("Erreur recherche YouTube:", e);
  }
  return null;
}

// Mettre à jour l'UI de la playlist
function updatePlaylistUI() {
  const container = document.getElementById("playlistContainer");
  const countEl = document.getElementById("playlistCount");

  savePlaylistToStorage();

  countEl.textContent = `${state.playlist.length} piste${state.playlist.length > 1 ? "s" : ""}`;

  if (state.playlist.length === 0) {
    container.innerHTML = `
            <div class="playlist-empty">
                <p>Playlist vide</p>
                <p class="hint">Ajoutez des pistes depuis la recherche ou via URL</p>
            </div>
            <div class="playlist-bottom-buttons">
              <div class="playlist-add-suggestion-wrapper">
                <div class="playlist-add-suggestion url-btn" onclick="showAddUrlInput()">
                  <span class="add-icon">🔗</span>
                  <span class="add-text">Ajouter une URL YouTube</span>
                </div>
              </div>
            </div>
            <div class="playlist-url-input" id="playlistUrlInput" style="display: none;">
              <input type="text" id="urlInputField" placeholder="Coller un lien YouTube ou ID vidéo..." onkeypress="if(event.key==='Enter')addUrlToPlaylist()" />
              <button onclick="addUrlToPlaylist()">+</button>
              <button onclick="hideAddUrlInput()" class="btn-cancel">✕</button>
            </div>
        `;
    return;
  }

  let html = "";
  state.playlist.forEach((track, index) => {
    const isPlayingOnA = state.loadedTracks.A === track.id && state.isPlaying.A;
    const isPlayingOnB = state.loadedTracks.B === track.id && state.isPlaying.B;
    const isPlaying = isPlayingOnA || isPlayingOnB;
    const isLoaded =
      state.loadedTracks.A === track.id || state.loadedTracks.B === track.id;

    let deckClass = "";
    if (track.id === state.loadedTracks.A) {
      deckClass = "on-deck-a";
    } else if (track.id === state.loadedTracks.B) {
      deckClass = "on-deck-b";
    }

    const isCurrentIndex = state.playlistIndex === index;

    html += `
            <div class="playlist-item ${isPlaying ? "is-playing-in-playlist" : ""} ${isLoaded ? "is-loaded" : ""} ${deckClass} ${isCurrentIndex ? "is-current-index" : ""}" data-index="${index}" draggable="true">
                ${isCurrentIndex ? '<div class="playlist-cursor-float"></div>' : ""}
                <span class="playlist-item-number ${deckClass}">${index + 1}</span>
                <img class="playlist-item-thumb" src="${track.thumbnail}" alt="">
                <div class="playlist-item-info">
                    <div class="playlist-item-title">${track.title}</div>
                </div>
                <span class="playlist-item-duration">${formatDuration(track.duration)}</span>
                ${isPlaying ? '<div class="playing-indicator"></div>' : ""}
                <div class="btn-action-group">
                    <button onclick="loadToDeck('A', '${track.id}')" title="Charger sur Deck A">A</button>
                    <button onclick="loadToDeck('B', '${track.id}')" title="Charger sur Deck B">B</button>
                </div>
                <div class="btn-move-group">
                    <button class="btn-move-up" onclick="movePlaylistItem(${index}, -1)" title="Monter" ${index === 0 ? "disabled" : ""}>▲</button>
                    <button class="btn-move-down" onclick="movePlaylistItem(${index}, 1)" title="Descendre" ${index === state.playlist.length - 1 ? "disabled" : ""}>▼</button>
                </div>
                <button class="btn-suggest" onclick="getSuggestionsForTrack(${index})" title="Suggestions similaires">✨</button>
                <button class="btn-remove" onclick="removeFromPlaylist(${index})" title="Supprimer">✕</button>
            </div>
        `;
  });

  // Placeholder pour le statut DJ Auto + Boutons
  // Les boutons Suggestion et Mix nécessitent une clé API
  const hasApiKey = apiKeys && apiKeys.length > 0;

  const suggestionBtn = hasApiKey
    ? `
      <div class="playlist-add-suggestion-wrapper">
        <div class="playlist-add-suggestion" onclick="toggleSuggestionMenu(event)">
          <span class="add-icon">+</span>
          <span class="add-text">Suggestion</span>
          <span class="add-arrow">▼</span>
        </div>
        <div class="suggestion-menu" id="suggestionMenu">
          <div class="suggestion-menu-item" onclick="addAutoSuggestion('similar')">
            <span class="menu-icon">🎵</span> Titre similaire
          </div>
          <div class="suggestion-menu-item" onclick="addAutoSuggestion('artist')">
            <span class="menu-icon">🎤</span> Même artiste
          </div>
          <div class="suggestion-menu-item" onclick="addAutoSuggestion('genre')">
            <span class="menu-icon">🎸</span> Même genre
          </div>
        </div>
      </div>`
    : "";

  const mixBtn = hasApiKey
    ? `
      <div class="playlist-add-suggestion-wrapper">
        <div class="playlist-add-suggestion mix-btn" onclick="toggleMixMenu(event)">
          <span class="add-icon">🎧</span>
          <span class="add-text">Mix</span>
          <span class="add-arrow">▼</span>
        </div>
        <div class="suggestion-menu" id="mixMenu">
          <div class="suggestion-menu-item" onclick="addMixToPlaylist('pop')">Pop</div>
          <div class="suggestion-menu-item" onclick="addMixToPlaylist('rock')">Rock</div>
          <div class="suggestion-menu-item" onclick="addMixToPlaylist('electronic')">Electronic</div>
          <div class="suggestion-menu-item" onclick="addMixToPlaylist('hip-hop')">Hip-Hop</div>
          <div class="suggestion-menu-item" onclick="addMixToPlaylist('disco')">Disco</div>
          <div class="suggestion-menu-item" onclick="addMixToPlaylist('funk')">Funk</div>
          <div class="suggestion-menu-item" onclick="addMixToPlaylist('soul')">Soul</div>
          <div class="suggestion-menu-item" onclick="addMixToPlaylist('jazz')">Jazz</div>
          <div class="suggestion-menu-item" onclick="addMixToPlaylist('zouk')">Zouk</div>
          <div class="suggestion-menu-item" onclick="addMixToPlaylist('french')">Variété Française</div>
          <div class="suggestion-menu-item" onclick="addMixToPlaylist('80s')">Années 80</div>
          <div class="suggestion-menu-item" onclick="addMixToPlaylist('90s')">Années 90</div>
          <div class="suggestion-menu-item" onclick="addMixToPlaylist('dance')">Dance</div>
          <div class="suggestion-menu-item" onclick="addMixToPlaylist('chillout')">Chillout</div>
          <div class="suggestion-menu-item" onclick="addMixToPlaylist('metal')">Metal</div>
          <div class="suggestion-menu-item" onclick="addMixToPlaylist('indie')">Indie</div>
        </div>
      </div>`
    : "";

  const addSuggestionBtn = `
    <div id="djAutoStatusContainer"></div>
    <div class="playlist-bottom-buttons">
      ${suggestionBtn}
      ${mixBtn}
      <div class="playlist-add-suggestion-wrapper">
        <div class="playlist-add-suggestion url-btn" onclick="showAddUrlInput()">
          <span class="add-icon">🔗</span>
          <span class="add-text">URL</span>
        </div>
      </div>
    </div>
    <div class="playlist-url-input" id="playlistUrlInput" style="display: none;">
      <input type="text" id="urlInputField" placeholder="Coller un lien YouTube ou ID vidéo..." onkeypress="if(event.key==='Enter')addUrlToPlaylist()" />
      <button onclick="addUrlToPlaylist()">+</button>
      <button onclick="hideAddUrlInput()" class="btn-cancel">✕</button>
    </div>
  `;

  container.innerHTML =
    '<div class="playlist-timeline-bar" id="playlistTimelineBar"></div>' +
    '<div class="playlist-items-wrapper">' +
    html +
    addSuggestionBtn +
    "</div>";

  addPlaylistDragDropListeners();
  addTimelineBarListeners();
  addCursorDragListeners();
}

// Mettre à jour les styles des items de la playlist
function updatePlaylistItemStyles() {
  const items = document.querySelectorAll(".playlist-item");
  items.forEach((item, index) => {
    const track = state.playlist[index];
    if (!track) return;

    const isPlayingOnA = state.loadedTracks.A === track.id && state.isPlaying.A;
    const isPlayingOnB = state.loadedTracks.B === track.id && state.isPlaying.B;
    const isPlaying = isPlayingOnA || isPlayingOnB;
    const isLoaded =
      state.loadedTracks.A === track.id || state.loadedTracks.B === track.id;

    item.classList.toggle("is-playing-in-playlist", isPlaying);
    item.classList.toggle("is-loaded", isLoaded);

    if (track.id === state.loadedTracks.A) {
      item.classList.add("on-deck-a");
      item.classList.remove("on-deck-b");
    } else if (track.id === state.loadedTracks.B) {
      item.classList.add("on-deck-b");
      item.classList.remove("on-deck-a");
    } else {
      item.classList.remove("on-deck-a");
      item.classList.remove("on-deck-b");
    }

    item.classList.toggle("is-current-index", index === state.playlistIndex);
  });
}

// Mettre à jour la position du cursor
function updatePlaylistCursorPosition() {
  const items = document.querySelectorAll(".playlist-item");
  items.forEach((item, index) => {
    if (index === state.playlistIndex) {
      item.classList.add("is-current-index");
    } else {
      item.classList.remove("is-current-index");
    }
  });
}

// Listeners pour la barre de timeline
function addTimelineBarListeners() {
  const bar = document.getElementById("playlistTimelineBar");
  if (!bar) return;

  bar.addEventListener("click", (e) => {
    const items = document.querySelectorAll(".playlist-item");
    if (items.length === 0) return;

    const clickY = e.clientY;
    let closestIndex = 0;
    let closestDistance = Infinity;

    items.forEach((item, index) => {
      const rect = item.getBoundingClientRect();
      const itemCenterY = rect.top + rect.height / 2;
      const distance = Math.abs(clickY - itemCenterY);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    setPlaylistIndex(closestIndex);
  });
}

// Listeners pour le drag du cursor
function addCursorDragListeners() {
  const cursor = document.querySelector(".playlist-cursor-float");
  if (!cursor) return;

  let isDragging = false;

  cursor.addEventListener("mousedown", (e) => {
    isDragging = true;
    e.preventDefault();
    document.body.style.cursor = "grabbing";
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;

    const items = document.querySelectorAll(".playlist-item");
    if (items.length === 0) return;

    const mouseY = e.clientY;
    let closestIndex = 0;
    let closestDistance = Infinity;

    items.forEach((item, index) => {
      const rect = item.getBoundingClientRect();
      const itemCenterY = rect.top + rect.height / 2;
      const distance = Math.abs(mouseY - itemCenterY);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    if (closestIndex !== state.playlistIndex) {
      state.playlistIndex = closestIndex;
      updatePlaylistCursorPosition();
    }
  });

  document.addEventListener("mouseup", () => {
    if (isDragging) {
      isDragging = false;
      document.body.style.cursor = "default";
      const inactiveDeck = state.isPlaying.A
        ? "B"
        : state.isPlaying.B
          ? "A"
          : "A";
      preloadNextTrack(inactiveDeck);
      updatePlaylistUI();
    }
  });
}

// Listeners pour le drag & drop de la playlist
function addPlaylistDragDropListeners() {
  const container = document.getElementById("playlistContainer");
  const items = document.querySelectorAll(".playlist-item");

  let draggedIndex = null;

  items.forEach((item) => {
    item.addEventListener("dragstart", (e) => {
      e.stopPropagation();
      draggedIndex = parseInt(e.currentTarget.dataset.index, 10);
      e.dataTransfer.setData("text/playlist-index", draggedIndex.toString());
      e.dataTransfer.effectAllowed = "move";
      e.currentTarget.classList.add("dragging");
    });

    item.addEventListener("dragend", (e) => {
      e.currentTarget.classList.remove("dragging");
      document
        .querySelectorAll(".playlist-item")
        .forEach((it) => it.classList.remove("drag-over"));
      draggedIndex = null;
    });

    item.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!e.currentTarget.classList.contains("dragging")) {
        document.querySelectorAll(".playlist-item").forEach((it) => {
          if (it !== e.currentTarget) it.classList.remove("drag-over");
        });
        e.currentTarget.classList.add("drag-over");
      }
    });

    item.addEventListener("dragleave", (e) => {
      if (!e.currentTarget.contains(e.relatedTarget)) {
        e.currentTarget.classList.remove("drag-over");
      }
    });

    item.addEventListener("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();

      const targetIndex = parseInt(e.currentTarget.dataset.index, 10);

      document.querySelectorAll(".playlist-item").forEach((it) => {
        it.classList.remove("drag-over");
        it.classList.remove("dragging");
      });

      if (
        draggedIndex !== null &&
        !isNaN(targetIndex) &&
        draggedIndex !== targetIndex
      ) {
        reorderPlaylist(draggedIndex, targetIndex);
      }
      draggedIndex = null;
    });
  });

  container.addEventListener(
    "drop",
    (e) => {
      if (draggedIndex !== null) {
        e.preventDefault();
        e.stopPropagation();
        const targetIndex = state.playlist.length - 1;
        if (draggedIndex !== targetIndex) {
          reorderPlaylist(draggedIndex, targetIndex);
        }
        draggedIndex = null;
      }
    },
    true,
  );
}
