/**
 * YouTube DJ Mixer - YouTube API Module
 * Recherche et récupération d'infos vidéos YouTube
 * Utilise fetchWithApiKey() pour la rotation automatique des clés
 */

// Extraire l'ID vidéo d'une URL ou d'un ID direct
function extractVideoId(input) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Recherche YouTube
async function searchYouTube(query) {
  const resultsContainer = document.getElementById("searchResults");

  // Vérifier si une clé API est configurée
  if (!apiKeys || apiKeys.length === 0) {
    resultsContainer.innerHTML = `
      <div class="search-no-api-key" onclick="document.getElementById('configModal').classList.add('active')">
        <p>🔑 Clé API YouTube requise</p>
        <p class="hint">Cliquez ici pour configurer votre clé API</p>
      </div>
    `;
    return;
  }

  // Vérifier si c'est une URL directe
  const videoId = extractVideoId(query);
  if (videoId) {
    await fetchVideoInfo(videoId);
    return;
  }

  // Afficher le loader
  resultsContainer.innerHTML = `
        <div class="search-loading">
            <div class="loader"></div>
            <p>Recherche en cours...</p>
        </div>
    `;

  try {
    // Step 1: Search for video IDs
    const searchResponse = await fetchWithApiKey(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=15&type=video&q=${encodeURIComponent(query)}&key=API_KEY`,
    );
    const searchData = await searchResponse.json();

    if (!searchData.items || searchData.items.length === 0) {
      displaySearchResults([]);
      return;
    }

    // Step 2: Get video details for all found videos in one call
    const videoIds = searchData.items.map((item) => item.id.videoId).join(",");
    const videosResponse = await fetchWithApiKey(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,topicDetails&id=${videoIds}&key=API_KEY`,
    );
    const videosData = await videosResponse.json();

    // The order of videos in the response is not guaranteed to be the same as the order of IDs in the request.
    // We need to reorder them.
    const orderedVideos = videoIds
      .split(",")
      .map((id) => videosData.items.find((v) => v.id === id))
      .filter((v) => v);

    displaySearchResults(orderedVideos);
  } catch (error) {
    console.error("Erreur recherche:", error);
    resultsContainer.innerHTML = `
            <div class="search-error">
                <p>Erreur lors de la recherche</p>
                <p class="hint">${error.message}</p>
            </div>
        `;
  }
}

// Récupérer les infos d'une vidéo par son ID
async function fetchVideoInfo(videoId) {
  const resultsContainer = document.getElementById("searchResults");

  try {
    const response = await fetchWithApiKey(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,topicDetails&id=${videoId}&key=API_KEY`,
    );

    const data = await response.json();

    if (data.items && data.items.length > 0) {
      displaySearchResults(data.items);
    } else {
      throw new Error("Vidéo non trouvée");
    }
  } catch (error) {
    // Fallback: afficher quand même avec l'ID
    resultsContainer.innerHTML = `
            <div class="search-result-item" data-video-id="${videoId}">
                <img class="search-result-thumb" src="https://img.youtube.com/vi/${videoId}/mqdefault.jpg" alt="Thumbnail">
                <div class="search-result-info">
                    <div class="search-result-title">Vidéo YouTube</div>
                    <div class="search-result-channel">ID: ${videoId}</div>
                </div>
                <div class="search-result-actions">
                    <button class="btn-add-deck deck-a-btn" onclick="loadToDeck('A', '${videoId}', 'Vidéo YouTube')">A</button>
                    <button class="btn-add-deck deck-b-btn" onclick="loadToDeck('B', '${videoId}', 'Vidéo YouTube')">B</button>
                    <button class="btn-add-playlist" onclick="addToPlaylist('${videoId}', 'Vidéo YouTube')">+</button>
                </div>
            </div>
        `;
  }
}

// Afficher les résultats de recherche
function displaySearchResults(items) {
  const resultsContainer = document.getElementById("searchResults");

  if (!items || items.length === 0) {
    resultsContainer.innerHTML = `
            <div class="search-placeholder">
                <p>Aucun résultat trouvé</p>
            </div>
        `;
    return;
  }

  let html = "";
  items.forEach((item) => {
    const videoId = item.id.videoId || item.id;
    const { artist, title } = extractArtistAndTitle(item);
    const displayTitle = artist ? `${artist} - ${title}` : title;
    const escapedTitle = displayTitle
      .replace(/'/g, "\'")
      .replace(/"/g, "&quot;");

    const channel = item.snippet.channelTitle;
    const thumbnail =
      item.snippet.thumbnails.medium?.url ||
      item.snippet.thumbnails.default?.url;

    html += `
            <div class="search-result-item" data-video-id="${videoId}" data-title="${escapedTitle}" draggable="true">
                <img class="search-result-thumb" src="${thumbnail}" alt="Thumbnail" draggable="false">
                <div class="search-result-info">
                    <div class="search-result-title">${displayTitle}</div>
                    <div class="search-result-channel">${channel}</div>
                </div>
                <div class="search-result-actions">
                    <button class="btn-add-deck deck-a-btn" onclick="loadToDeck('A', '${videoId}', '${escapedTitle}')">A</button>
                    <button class="btn-add-deck deck-b-btn" onclick="loadToDeck('B', '${videoId}', '${escapedTitle}')">B</button>
                    <button class="btn-add-playlist" onclick="addToPlaylist('${videoId}', '${escapedTitle}')">+</button>
                </div>
            </div>
        `;
  });

  resultsContainer.innerHTML = html;

  // Ajouter les event listeners pour le drag
  document.querySelectorAll(".search-result-item").forEach((item) => {
    item.addEventListener("dragstart", handleDragStart);
  });
}

// Récupérer la durée d'une vidéo
async function fetchVideoDuration(videoId) {
  try {
    const response = await fetchWithApiKey(
      `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoId}&key=API_KEY`,
    );
    const data = await response.json();
    if (data.items && data.items.length > 0) {
      const duration = data.items[0].contentDetails.duration;
      return parseISO8601Duration(duration);
    }
  } catch (e) {
    console.error("Erreur fetch duration:", e);
  }
  return null;
}

// Parser la durée ISO 8601 (PT1H2M3S)
function parseISO8601Duration(duration) {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return null;
  const hours = parseInt(match[1] || 0);
  const minutes = parseInt(match[2] || 0);
  const seconds = parseInt(match[3] || 0);
  return hours * 3600 + minutes * 60 + seconds;
}

// Récupérer des vidéos similaires
async function fetchRelatedVideos(videoId, trackTitle) {
  try {
    // Nettoyer le titre pour la recherche
    let cleanTitle = trackTitle
      .replace(/\([^)]*\)/g, "")
      .replace(/[[^\]]*]/g, "")
      .replace(/official|video|audio|lyrics|hd|hq|remix|feat\.?|ft\.?/gi, "")
      .replace(/[|•·—–-]/g, " ")
      .trim();

    // 1. Chercher des playlists contenant cette chanson
    const playlistSearchQuery = `"${cleanTitle.split(/\s+/).slice(0, 3).join(" ")}" playlist mix`;

    const playlistResponse = await fetchWithApiKey(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(playlistSearchQuery)}&type=playlist&maxResults=3&key=API_KEY`,
    );

    let suggestions = [];

    if (playlistResponse.ok) {
      const playlistData = await playlistResponse.json();

      if (playlistData.items && playlistData.items.length > 0) {
        // Récupérer les vidéos des playlists trouvées
        for (const playlist of playlistData.items.slice(0, 2)) {
          const playlistId = playlist.id.playlistId;
          try {
            const itemsResponse = await fetchWithApiKey(
              `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=15&key=API_KEY`,
            );

            const itemsData = await itemsResponse.json();
            if (itemsData.items) {
              const playlistVideos = itemsData.items
                .filter((item) => item.snippet.resourceId.videoId !== videoId)
                .map((item) => ({
                  id: item.snippet.resourceId.videoId,
                  title: item.snippet.title,
                  thumbnail:
                    item.snippet.thumbnails?.medium?.url ||
                    item.snippet.thumbnails?.default?.url,
                  channel: item.snippet.videoOwnerChannelTitle || "",
                }));
              suggestions = suggestions.concat(playlistVideos);
            }
          } catch (e) {
            console.warn("Erreur playlist items:", e);
          }
        }
      }
    }

    // Dédupliquer par videoId
    const seen = new Set();
    suggestions = suggestions.filter((s) => {
      if (seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });

    // Si on a assez de résultats, retourner
    if (suggestions.length >= 8) {
      return suggestions.slice(0, 12);
    }

    // 2. Sinon, chercher sur la chaîne de l'artiste
    const artistSearch = cleanTitle.split(/\s+/).slice(0, 2).join(" ");
    try {
      const fallbackResponse = await fetchWithApiKey(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(artistSearch + " music")}&type=video&maxResults=15&key=API_KEY`,
      );

      const fallbackData = await fallbackResponse.json();
      if (fallbackData.items) {
        const originalWords = cleanTitle.toLowerCase().split(/\s+/);
        const fallbackVideos = fallbackData.items
          .filter((item) => {
            if (item.id.videoId === videoId) return false;
            if (seen.has(item.id.videoId)) return false;
            // Exclure si trop similaire
            const itemTitle = item.snippet.title.toLowerCase();
            const commonWords = originalWords.filter(
              (w) => w.length > 3 && itemTitle.includes(w),
            );
            return commonWords.length < 3;
          })
          .map((item) => ({
            id: item.id.videoId,
            title: item.snippet.title,
            thumbnail:
              item.snippet.thumbnails?.medium?.url ||
              item.snippet.thumbnails?.default?.url,
            channel: item.snippet.channelTitle,
          }));
        suggestions = suggestions.concat(fallbackVideos);
      }
    } catch (e) {
      console.warn("Erreur fallback search:", e);
    }

    return suggestions.slice(0, 12);
  } catch (e) {
    console.error("Erreur fetch related:", e);
    return [];
  }
}

// Search YouTube and return the first result for suggestions
async function searchYouTubeForSuggestions(query) {
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
          item.snippet.thumbnails.medium?.url ||
          item.snippet.thumbnails.default?.url,
        channel: item.snippet.channelTitle,
      };
    }
  } catch (error) {
    console.error("Error searching YouTube for suggestions:", error);
  }
  return null;
}

function extractArtistAndTitle(video) {
  let artist = null;
  let title = video.snippet.title;

  // Step 1: Check topicDetails for music artist
  if (video.topicDetails && video.topicDetails.topicCategories) {
    for (const categoryUrl of video.topicDetails.topicCategories) {
      if (categoryUrl.startsWith("https://en.wikipedia.org/wiki/")) {
        const topic = categoryUrl.substring(
          "https://en.wikipedia.org/wiki/".length,
        );
        if (topic.includes("(musician)") || topic.includes("(band)")) {
          artist = topic.replace(/_\(.+\)/, "").replace(/_/g, " ");
          break;
        }
      }
    }
  }

  // Step 2: Use channelTitle as a fallback
  if (!artist) {
    const channelTitle = video.snippet.channelTitle;
    if (
      channelTitle.toLowerCase().endsWith("vevo") ||
      channelTitle.toLowerCase().endsWith("official")
    ) {
      artist = channelTitle.replace(/vevo|official/i, "").trim();
    }
  }

  // Step 3: Parse the title as a last resort
  if (!artist) {
    const parts = title.split(" - ");
    if (parts.length > 1) {
      artist = parts[0].trim();
      title = parts.slice(1).join(" - ").trim();
    }
  }

  return { artist, title };
}
