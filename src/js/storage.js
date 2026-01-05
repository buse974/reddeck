/**
 * YouTube DJ Mixer - Storage Module
 * Persistance localStorage
 */

// Sauvegarder la playlist
function savePlaylistToStorage() {
  localStorage.setItem("dj_playlist", JSON.stringify(state.playlist));
  localStorage.setItem("dj_playlist_index", state.playlistIndex.toString());
}

// Charger la playlist
function loadPlaylistFromStorage() {
  const savedPlaylist = localStorage.getItem("dj_playlist");
  const savedIndex = localStorage.getItem("dj_playlist_index");

  if (savedPlaylist) {
    try {
      state.playlist = JSON.parse(savedPlaylist);
      state.playlistIndex = savedIndex ? parseInt(savedIndex, 10) : 0;
      if (state.playlistIndex >= state.playlist.length) {
        state.playlistIndex = 0;
      }
    } catch (e) {
      console.error("Erreur chargement playlist:", e);
      state.playlist = [];
      state.playlistIndex = 0;
    }
  }
}

// Ajouter une clé API
function addApiKey(apiKey) {
  if (!apiKey || apiKeys.includes(apiKey)) return false;
  apiKeys.push(apiKey);
  YOUTUBE_API_KEY = apiKeys[currentApiKeyIndex];
  localStorage.setItem("dj_youtube_api_keys", JSON.stringify(apiKeys));
  updateApiKeysUI();
  updateApiKeyStatus();
  checkApiKeyStatus();
  return true;
}

// Supprimer une clé API
function removeApiKey(index) {
  if (apiKeys.length <= 1) return false; // Garder au moins une clé
  apiKeys.splice(index, 1);
  if (currentApiKeyIndex >= apiKeys.length) {
    currentApiKeyIndex = 0;
  }
  YOUTUBE_API_KEY = apiKeys[currentApiKeyIndex];
  localStorage.setItem("dj_youtube_api_keys", JSON.stringify(apiKeys));
  localStorage.setItem(
    "dj_youtube_api_key_index",
    currentApiKeyIndex.toString(),
  );
  updateApiKeysUI();
  updateApiKeyStatus();
  return true;
}

// Afficher la liste des clés API
function updateApiKeysUI() {
  const container = document.getElementById("apiKeysList");
  if (!container) return;

  let html = "";
  apiKeys.forEach((key, index) => {
    const isActive = index === currentApiKeyIndex;
    const maskedKey =
      key.substring(0, 10) + "..." + key.substring(key.length - 4);
    html += `
      <div class="api-key-item ${isActive ? "active" : ""}">
        <span class="key-index">#${index + 1}</span>
        <span class="key-text">${maskedKey}</span>
        ${isActive ? '<span style="color: var(--accent-green);">●</span>' : ""}
        <button class="btn-remove-key" onclick="removeApiKey(${index})" ${apiKeys.length <= 1 ? "disabled" : ""}>×</button>
      </div>
    `;
  });
  container.innerHTML = html;
}

// Réinitialiser le stockage
function resetStorage() {
  localStorage.removeItem("dj_playlist");
  localStorage.removeItem("dj_playlist_index");
  localStorage.removeItem("dj_youtube_api_keys");
  localStorage.removeItem("dj_youtube_api_key_index");
  state.playlist = [];
  state.playlistIndex = 0;
  apiKeys = [...DEFAULT_API_KEYS];
  currentApiKeyIndex = 0;
  YOUTUBE_API_KEY = apiKeys[0];
  updatePlaylistUI();
  updateApiKeysUI();
  updateApiKeyStatus();
}
