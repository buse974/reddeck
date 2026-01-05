/**
 * YouTube DJ Mixer - State Module
 * Configuration et état global de l'application
 */

// Configuration API YouTube - Multi-clés avec rotation
const DEFAULT_API_KEYS = [];

// Charger les clés depuis localStorage
let apiKeys =
  JSON.parse(localStorage.getItem("dj_youtube_api_keys") || "null") || [];
let currentApiKeyIndex = parseInt(
  localStorage.getItem("dj_youtube_api_key_index") || "0",
);
if (currentApiKeyIndex >= apiKeys.length) currentApiKeyIndex = 0;

// Clé active
let YOUTUBE_API_KEY = apiKeys[currentApiKeyIndex];

// Rotation de clé API
function rotateApiKey() {
  const previousIndex = currentApiKeyIndex;
  currentApiKeyIndex = (currentApiKeyIndex + 1) % apiKeys.length;
  YOUTUBE_API_KEY = apiKeys[currentApiKeyIndex];
  localStorage.setItem(
    "dj_youtube_api_key_index",
    currentApiKeyIndex.toString(),
  );

  updateApiKeyStatus();

  // Retourne true si on a encore des clés à essayer
  return currentApiKeyIndex !== previousIndex;
}

// Vérifier si l'erreur est une limite de quota
function isQuotaError(error) {
  if (!error) return false;
  const message = error.message || error.toString();
  return (
    message.includes("403") ||
    message.includes("quota") ||
    message.includes("Quota") ||
    message.includes("exceeded") ||
    message.includes("rateLimitExceeded")
  );
}

// Wrapper pour les appels API avec retry automatique
async function fetchWithApiKey(url) {
  const startIndex = currentApiKeyIndex;

  do {
    const fullUrl = url.replace("API_KEY", YOUTUBE_API_KEY);
    try {
      const response = await fetch(fullUrl);

      if (response.status === 403) {
        console.warn(`Quota atteint pour la clé ${currentApiKeyIndex + 1}`);
        if (!rotateApiKey() || currentApiKeyIndex === startIndex) {
          throw new Error("Toutes les clés API ont atteint leur quota");
        }
        continue;
      }

      if (!response.ok) {
        throw new Error(`Erreur API: ${response.status}`);
      }

      return response;
    } catch (error) {
      if (isQuotaError(error)) {
        console.warn(`Quota atteint pour la clé ${currentApiKeyIndex + 1}`);
        if (!rotateApiKey() || currentApiKeyIndex === startIndex) {
          throw new Error("Toutes les clés API ont atteint leur quota");
        }
        continue;
      }
      throw error;
    }
  } while (currentApiKeyIndex !== startIndex);

  throw new Error("Toutes les clés API ont atteint leur quota");
}

// Mettre à jour l'affichage du statut des clés
function updateApiKeyStatus() {
  const statusEl = document.getElementById("apiKeyStatus");
  if (statusEl) {
    if (apiKeys.length === 0) {
      statusEl.textContent = "Aucune clé";
      statusEl.title = "Aucune clé API configurée";
    } else {
      statusEl.textContent = `Clé ${currentApiKeyIndex + 1}/${apiKeys.length}`;
      statusEl.title = `Utilisation de la clé API ${currentApiKeyIndex + 1} sur ${apiKeys.length}`;
    }
  }
}

// Vérifier et afficher l'état de la clé API dans la zone de recherche
function checkApiKeyStatus() {
  const searchPanel = document.querySelector(".search-panel");
  const searchBar = document.querySelector(".search-bar");
  const searchResults = document.getElementById("searchResults");

  if (!apiKeys || apiKeys.length === 0) {
    // Griser la barre de recherche
    if (searchBar) {
      searchBar.classList.add("disabled");
      const input = searchBar.querySelector("input");
      const btn = searchBar.querySelector("button");
      if (input) input.disabled = true;
      if (btn) btn.disabled = true;
    }
    // Afficher le message
    if (searchResults) {
      searchResults.innerHTML = `
        <div class="search-no-api-key" onclick="document.getElementById('configModal').classList.add('active')">
          <p>🔑 Clé API YouTube requise</p>
          <p class="hint">Cliquez ici pour configurer votre clé API</p>
        </div>
      `;
    }
  } else {
    // Réactiver la barre de recherche
    if (searchBar) {
      searchBar.classList.remove("disabled");
      const input = searchBar.querySelector("input");
      const btn = searchBar.querySelector("button");
      if (input) input.disabled = false;
      if (btn) btn.disabled = false;
    }
  }
}

// État global de l'application
const state = {
  players: {
    A: null,
    B: null,
  },
  currentDeck: "A",
  isPlaying: {
    A: false,
    B: false,
  },
  volumes: {
    A: 100,
    B: 100,
    master: 80,
  },
  crossfaderPosition: 50,
  loadedTracks: {
    A: null,
    B: null,
  },
  durations: {
    A: 0,
    B: 0,
  },
  currentTimes: {
    A: 0,
    B: 0,
  },
  playlist: [],
  playlistIndex: 0,
  autoMix: true,
  crossfadeDuration: 5,
  isCrossfading: false,
  updateInterval: null,
  playlistMode: "repeat", // "repeat" = boucle, "dj" = suggestions auto
  isFetchingAutoSuggestion: false, // évite les appels multiples
};

// Utilitaires de formatage
function formatTime(seconds) {
  if (!seconds || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return mins + ":" + (secs < 10 ? "0" : "") + secs;
}

function formatDuration(seconds) {
  if (!seconds) return "--:--";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
