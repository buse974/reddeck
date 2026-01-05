/**
 * RedDeck - UI Module
 * Interface, drag & drop, event listeners, redimensionnement
 */

// Welcome Modal - Afficher à la première visite
function showWelcomeModal() {
  if (!localStorage.getItem("reddeck_welcome_shown")) {
    const modal = document.getElementById("welcomeModal");
    if (modal) {
      modal.classList.add("active");
    }
  }
}

function closeWelcomeModal() {
  const modal = document.getElementById("welcomeModal");
  if (modal) {
    modal.classList.remove("active");
    localStorage.setItem("reddeck_welcome_shown", "true");
  }
}

// Drag and Drop handlers
function handleDragStart(e) {
  const videoId = e.currentTarget.dataset.videoId;
  const title = e.currentTarget.dataset.title;
  e.dataTransfer.setData(
    "application/json",
    JSON.stringify({ videoId, title }),
  );
  e.dataTransfer.effectAllowed = "copy";
  e.currentTarget.classList.add("dragging");

  // Afficher les boucliers pour permettre le drop sur les vidéos
  document.getElementById("dropShieldA").style.display = "block";
  document.getElementById("dropShieldB").style.display = "block";
}

function handleDragEnd(e) {
  e.currentTarget.classList.remove("dragging");

  // Cacher les boucliers
  document.getElementById("dropShieldA").style.display = "none";
  document.getElementById("dropShieldB").style.display = "none";
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = "copy";
  e.currentTarget.classList.add("drag-over");
}

function handleDragLeave(e) {
  e.currentTarget.classList.remove("drag-over");
}

function handleDropOnDeck(deck, e) {
  e.preventDefault();
  e.stopPropagation();
  e.currentTarget.classList.remove("drag-over");

  try {
    const jsonData = e.dataTransfer.getData("application/json");
    if (!jsonData) return;
    const data = JSON.parse(jsonData);
    if (data.videoId) {
      loadToDeck(deck, data.videoId, data.title || "Vidéo YouTube");
      addToPlaylist(data.videoId, data.title || "Vidéo YouTube");
    }
  } catch (err) {
    console.error("Erreur drop:", err);
  }
}

function handleDropOnPlaylist(e) {
  e.preventDefault();
  e.stopPropagation();
  e.currentTarget.classList.remove("drag-over");

  // Ignorer si c'est un réordonnancement interne de la playlist
  const playlistIndexData = e.dataTransfer.getData("text/playlist-index");
  if (playlistIndexData !== "") {
    return;
  }

  try {
    const jsonData = e.dataTransfer.getData("application/json");
    if (!jsonData) return;
    const data = JSON.parse(jsonData);
    if (data.videoId) {
      addToPlaylist(data.videoId, data.title || "Vidéo YouTube");
    }
  } catch (err) {
    console.error("Erreur drop playlist:", err);
  }
}

// Génération des barres de waveform
function generateWaveformBars() {
  ["A", "B"].forEach((deck) => {
    const container = document.querySelector(`#waveform${deck} .waveform-bars`);
    let bars = "";
    for (let i = 0; i < 100; i++) {
      const height = 20 + Math.random() * 60;
      bars += `<div style="width: 2px; height: ${height}%; background: ${deck === "A" ? "var(--deck-a-color)" : "var(--deck-b-color)"}; opacity: 0.5; border-radius: 1px;"></div>`;
    }
    container.innerHTML = bars;
  });
}

// Redimensionnement du panneau bas (vertical)
function setupResizeHandle() {
  const handle = document.getElementById("resizeHandle");
  const bottomSection = document.getElementById("bottomSection");
  const mixerMain = document.querySelector(".mixer-main");
  const header = document.querySelector(".header");
  const container = document.querySelector(".mixer-container");
  let isResizing = false;

  handle.addEventListener("mousedown", (e) => {
    isResizing = true;
    document.body.style.cursor = "row-resize";
    e.preventDefault();
  });

  document.addEventListener("mousemove", (e) => {
    if (!isResizing) return;
    e.preventDefault();

    const containerRect = container.getBoundingClientRect();
    const headerHeight = header.offsetHeight;
    const handleHeight = handle.offsetHeight;

    const mouseY = e.clientY - containerRect.top;
    const newMixerHeight = mouseY - headerHeight;
    const newBottomHeight = containerRect.height - mouseY - handleHeight;

    const minBottomHeight = 40;
    const minMixerHeight = 150;

    if (
      newBottomHeight >= minBottomHeight &&
      newMixerHeight >= minMixerHeight
    ) {
      mixerMain.style.flex = `0 0 ${newMixerHeight}px`;
      bottomSection.style.flex = `0 0 ${newBottomHeight}px`;
    }
  });

  document.addEventListener("mouseup", () => {
    isResizing = false;
    document.body.style.cursor = "default";
  });
}

// Redimensionnement horizontal (search/playlist)
function setupResizeHandleH() {
  const handle = document.getElementById("resizeHandleH");
  const searchPanel = document.querySelector(".search-panel");
  const playlistPanel = document.querySelector(".playlist-panel");
  const bottomSection = document.getElementById("bottomSection");
  let isResizing = false;

  handle.addEventListener("mousedown", (e) => {
    isResizing = true;
    document.body.style.cursor = "col-resize";
    e.preventDefault();
  });

  document.addEventListener("mousemove", (e) => {
    if (!isResizing) return;
    e.preventDefault();

    const sectionRect = bottomSection.getBoundingClientRect();
    const handleWidth = handle.offsetWidth;
    const padding = 20;
    const gap = 10;
    const availableWidth = sectionRect.width - handleWidth - padding - gap;

    const mouseX = e.clientX - sectionRect.left - 10;

    const newSearchWidth = Math.max(
      200,
      Math.min(mouseX, availableWidth - 200),
    );
    const newPlaylistWidth = availableWidth - newSearchWidth;

    searchPanel.style.flex = `0 0 ${newSearchWidth}px`;
    playlistPanel.style.flex = `0 0 ${newPlaylistWidth}px`;
  });

  document.addEventListener("mouseup", () => {
    if (isResizing) {
      isResizing = false;
      document.body.style.cursor = "default";
    }
  });
}

// Initialisation des event listeners
function initializeEventListeners() {
  // Deck A controls
  document
    .getElementById("playA")
    ?.addEventListener("click", () => playDeck("A"));
  document
    .getElementById("stopA")
    ?.addEventListener("click", () => stopDeck("A"));
  document
    .getElementById("cueA")
    ?.addEventListener("click", () => cueDeck("A"));
  // Les faders sont maintenant gérés par faders.js

  // Waveform seek - Deck A
  document.getElementById("waveformA").addEventListener("click", (e) => {
    seekFromWaveform("A", e);
  });

  // Deck B controls
  document
    .getElementById("playB")
    ?.addEventListener("click", () => playDeck("B"));
  document
    .getElementById("stopB")
    ?.addEventListener("click", () => stopDeck("B"));
  document
    .getElementById("cueB")
    ?.addEventListener("click", () => cueDeck("B"));
  // Les faders B sont maintenant gérés par faders.js

  // Waveform seek - Deck B
  document.getElementById("waveformB").addEventListener("click", (e) => {
    seekFromWaveform("B", e);
  });

  // Drag and drop sur les decks
  const deckA = document.getElementById("deckA");
  const deckB = document.getElementById("deckB");
  const playlistContainer = document.getElementById("playlistContainer");

  deckA.addEventListener("dragover", handleDragOver);
  deckA.addEventListener("dragleave", handleDragLeave);
  deckA.addEventListener("drop", (e) => handleDropOnDeck("A", e));

  deckB.addEventListener("dragover", handleDragOver);
  deckB.addEventListener("dragleave", handleDragLeave);
  deckB.addEventListener("drop", (e) => handleDropOnDeck("B", e));

  playlistContainer.addEventListener("dragover", handleDragOver);
  playlistContainer.addEventListener("dragleave", handleDragLeave);
  playlistContainer.addEventListener("drop", handleDropOnPlaylist);

  // Center controls
  document.getElementById("crossfader")?.addEventListener("input", (e) => {
    setCrossfader(parseInt(e.target.value));
  });

  // Le masterVolume est maintenant géré par faders.js

  document.getElementById("transitionBtn")?.addEventListener("click", () => {
    const fromDeck = state.currentDeck;
    const toDeck = fromDeck === "A" ? "B" : "A";
    startCrossfade(fromDeck, toDeck);
  });

  document.getElementById("nextBtn")?.addEventListener("click", () => {
    nextTrack();
  });

  // Header controls
  document.getElementById("autoMix").addEventListener("change", (e) => {
    state.autoMix = e.target.checked;
  });

  document
    .getElementById("crossfadeDuration")
    .addEventListener("change", (e) => {
      state.crossfadeDuration = parseInt(e.target.value);
    });

  // Search
  document.getElementById("searchBtn")?.addEventListener("click", () => {
    const query = document.getElementById("searchInput").value.trim();
    if (query) searchYouTube(query);
  });

  document.getElementById("searchInput")?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      const query = e.target.value.trim();
      if (query) searchYouTube(query);
    }
  });

  // Playlist controls
  document
    .getElementById("clearPlaylist")
    ?.addEventListener("click", clearPlaylist);
  document
    .getElementById("djModeToggle")
    ?.addEventListener("change", togglePlaylistMode);

  // Suggestions panel
  document
    .getElementById("btnSuggestions")
    ?.addEventListener("click", toggleSuggestionsPanel);
  document
    .getElementById("closeSuggestions")
    ?.addEventListener("click", closeSuggestionsPanel);
  document
    .getElementById("refreshSuggestions")
    ?.addEventListener("click", fetchSuggestions);

  // TV button
  document
    .getElementById("btnKaraoke")
    ?.addEventListener("click", openTvWindow);

  // Configuration modal
  const configModal = document.getElementById("configModal");
  const btnConfig = document.getElementById("btnConfig");
  const closeConfigModal = document.getElementById("closeConfigModal");
  const apiKeyInput = document.getElementById("apiKeyInput");
  const saveApiKeyBtn = document.getElementById("saveApiKey");
  const resetStorageBtn = document.getElementById("resetStorage");

  const savedApiKey = localStorage.getItem("dj_youtube_api_key");
  if (savedApiKey) {
    apiKeyInput.value = savedApiKey;
  }

  btnConfig?.addEventListener("click", () => {
    configModal.classList.add("active");
  });

  closeConfigModal?.addEventListener("click", () => {
    configModal.classList.remove("active");
  });

  // Welcome modal
  document
    .getElementById("closeWelcomeModal")
    ?.addEventListener("click", closeWelcomeModal);
  showWelcomeModal();

  configModal?.addEventListener("click", (e) => {
    if (e.target === configModal) {
      configModal.classList.remove("active");
    }
  });

  // Bouton ajouter une clé API
  const addApiKeyBtn = document.getElementById("addApiKey");
  addApiKeyBtn?.addEventListener("click", () => {
    const apiKey = apiKeyInput.value.trim();
    if (apiKey) {
      if (addApiKey(apiKey)) {
        apiKeyInput.value = "";
      } else {
        alert("Clé déjà présente ou invalide");
      }
    }
  });

  // Entrée clavier pour ajouter une clé
  apiKeyInput?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      const apiKey = apiKeyInput.value.trim();
      if (apiKey) {
        if (addApiKey(apiKey)) {
          apiKeyInput.value = "";
        }
      }
    }
  });

  resetStorageBtn?.addEventListener("click", () => {
    if (
      confirm(
        "Voulez-vous vraiment supprimer toutes les données (playlist et clé API)?",
      )
    ) {
      resetStorage();
      apiKeyInput.value = "";
      alert("Stockage réinitialisé!");
    }
  });

  // Debug TV toggle
  const debugKaraokeCheckbox = document.getElementById("debugKaraoke");
  debugKaraokeCheckbox?.addEventListener("change", (e) => {
    sendToTv({ type: "debug", enabled: e.target.checked });
  });

  // Keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT") return;

    switch (e.key.toLowerCase()) {
      case "a":
        playDeck("A");
        break;
      case "b":
        playDeck("B");
        break;
      case " ":
        e.preventDefault();
        playDeck(state.currentDeck);
        break;
      case "t":
        document.getElementById("transitionBtn").click();
        break;
    }
  });
}
