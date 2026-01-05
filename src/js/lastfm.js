/**
 * YouTube DJ Mixer - Last.fm Module
 * Handles Last.fm API calls and metadata extraction
 */

// Récupère la clé API depuis Config (localStorage ou .env)
const getLastFmKey = () => Config.getLastFmApiKey() || "";

/**
 * Extrait l'artiste et le titre depuis un titre YouTube (string)
 * Gère les formats courants : "Artiste - Titre", "Artiste | Titre", etc.
 */
function parseTrackTitle(youtubeTitle) {
  // Nettoyer le titre des éléments parasites
  let cleanTitle = youtubeTitle
    .replace(/\([^)]*\)/g, "") // (Official Video), (Lyrics), etc.
    .replace(/\[[^\]]*\]/g, "") // [Official], [HD], etc.
    .replace(/official\s*(music\s*)?video/gi, "")
    .replace(/official\s*audio/gi, "")
    .replace(/lyrics?\s*video/gi, "")
    .replace(/\b(hd|hq|4k|1080p|720p)\b/gi, "")
    .replace(/\bft\.?\s*/gi, "feat. ")
    .replace(/\bfeat\.?\s*/gi, "feat. ")
    .replace(/\bw\/\s*/gi, "feat. ")
    .replace(/\s+/g, " ")
    .trim();

  // Patterns de séparation artiste/titre (du plus spécifique au plus général)
  const separators = [
    /\s*[-–—]\s*/, // tirets
    /\s*[|]\s*/, // pipe
    /\s*[•·]\s*/, // bullet points
    /\s*:\s*/, // deux points
  ];

  for (const separator of separators) {
    const parts = cleanTitle.split(separator);
    if (parts.length >= 2) {
      let artist = parts[0].trim();
      let title = parts.slice(1).join(" - ").trim();

      // Nettoyer les "feat." de l'artiste
      if (artist.toLowerCase().includes("feat.")) {
        const featMatch = artist.match(/(.+?)\s*feat\.\s*(.+)/i);
        if (featMatch) {
          artist = featMatch[1].trim();
        }
      }

      // Vérifier validité
      if (artist.length >= 2 && title.length >= 2) {
        return { artist, title };
      }
    }
  }

  // Fallback: pas de séparateur trouvé
  return { artist: null, title: cleanTitle };
}

/**
 * Récupère des pistes similaires depuis Last.fm
 */
function getSimilarTracks(artist, track, callback) {
  const url = `https://ws.audioscrobbler.com/2.0/?method=track.getsimilar&artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(track)}&api_key=${getLastFmKey()}&format=json&limit=15`;

  fetch(url)
    .then((response) => response.json())
    .then((data) => {
      if (data.similartracks && data.similartracks.track) {
        callback(data.similartracks.track);
      } else {
        callback([]);
      }
    })
    .catch((error) => {
      console.error("Error fetching similar tracks from Last.fm:", error);
      callback([]);
    });
}

/**
 * Récupère les top tracks d'un artiste
 */
function getArtistTopTracks(artist, callback, limit = 10) {
  const url = `https://ws.audioscrobbler.com/2.0/?method=artist.gettoptracks&artist=${encodeURIComponent(artist)}&api_key=${getLastFmKey()}&format=json&limit=${limit}`;

  fetch(url)
    .then((response) => response.json())
    .then((data) => {
      if (data.toptracks && data.toptracks.track) {
        callback(data.toptracks.track);
      } else {
        callback([]);
      }
    })
    .catch((error) => {
      console.error("Error fetching artist top tracks:", error);
      callback([]);
    });
}

/**
 * Récupère des artistes similaires
 */
function getSimilarArtists(artist, callback, limit = 5) {
  const url = `https://ws.audioscrobbler.com/2.0/?method=artist.getsimilar&artist=${encodeURIComponent(artist)}&api_key=${getLastFmKey()}&format=json&limit=${limit}`;

  fetch(url)
    .then((response) => response.json())
    .then((data) => {
      if (data.similarartists && data.similarartists.artist) {
        callback(data.similarartists.artist);
      } else {
        callback([]);
      }
    })
    .catch((error) => {
      console.error("Error fetching similar artists:", error);
      callback([]);
    });
}

/**
 * Récupère des suggestions complètes (tracks similaires + fallbacks)
 * Retourne une Promise avec un tableau de {artist, title, match}
 */
async function fetchLastFmSuggestions(artist, title) {
  return new Promise((resolve) => {
    let results = [];
    let pendingCalls = 0;

    const checkComplete = () => {
      if (pendingCalls === 0) {
        // Dédupliquer et trier
        const seen = new Set();
        const unique = results
          .filter((r) => {
            const key = `${r.artist.toLowerCase()}-${r.title.toLowerCase()}`;
            if (seen.has(key)) return false;
            // Exclure la piste originale
            if (
              artist &&
              title &&
              r.artist.toLowerCase() === artist.toLowerCase() &&
              r.title.toLowerCase() === title.toLowerCase()
            )
              return false;
            seen.add(key);
            return true;
          })
          .sort((a, b) => (b.match || 0) - (a.match || 0));

        resolve(unique);
      }
    };

    // 1. Tracks similaires (si on a artiste + titre)
    if (artist && title) {
      pendingCalls++;
      getSimilarTracks(artist, title, (tracks) => {
        tracks.forEach((t) => {
          results.push({
            artist: t.artist.name,
            title: t.name,
            match: parseFloat(t.match) || 0.5,
          });
        });
        pendingCalls--;
        checkComplete();
      });
    }

    // 2. Top tracks de l'artiste (si on a un artiste)
    if (artist) {
      pendingCalls++;
      getArtistTopTracks(artist, (tracks) => {
        tracks.forEach((t) => {
          results.push({
            artist: t.artist.name,
            title: t.name,
            match: 0.4,
          });
        });
        pendingCalls--;
        checkComplete();
      });

      // 3. Artistes similaires et leurs top tracks
      pendingCalls++;
      getSimilarArtists(
        artist,
        (artists) => {
          if (artists.length === 0) {
            pendingCalls--;
            checkComplete();
            return;
          }

          let artistCalls = Math.min(artists.length, 3);
          artists.slice(0, 3).forEach((simArtist) => {
            getArtistTopTracks(
              simArtist.name,
              (tracks) => {
                tracks.slice(0, 2).forEach((t) => {
                  results.push({
                    artist: t.artist.name,
                    title: t.name,
                    match: (parseFloat(simArtist.match) || 0.5) * 0.3,
                  });
                });
                artistCalls--;
                if (artistCalls === 0) {
                  pendingCalls--;
                  checkComplete();
                }
              },
              2,
            );
          });
        },
        3,
      );
    }

    // Si aucun appel n'a été fait
    if (pendingCalls === 0) {
      resolve([]);
    }
  });
}

/**
 * Récupère les top tracks d'un artiste (pour "même artiste")
 */
async function fetchArtistTopTracks(artist) {
  try {
    const url = `https://ws.audioscrobbler.com/2.0/?method=artist.gettoptracks&artist=${encodeURIComponent(artist)}&api_key=${getLastFmKey()}&format=json&limit=20`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.toptracks && data.toptracks.track) {
      return data.toptracks.track.map((t) => ({
        artist: t.artist.name,
        title: t.name,
        match: 1,
      }));
    }
  } catch (e) {
    console.error("Last.fm artist top tracks error:", e);
  }
  return [];
}

/**
 * Récupère des tracks du même genre (via tags de l'artiste)
 */
async function fetchSameGenreTracks(artist) {
  try {
    // D'abord récupérer les tags de l'artiste
    const tagUrl = `https://ws.audioscrobbler.com/2.0/?method=artist.gettoptags&artist=${encodeURIComponent(artist)}&api_key=${getLastFmKey()}&format=json`;
    const tagResponse = await fetch(tagUrl);
    const tagData = await tagResponse.json();

    if (
      !tagData.toptags ||
      !tagData.toptags.tag ||
      tagData.toptags.tag.length === 0
    ) {
      return [];
    }

    // Prendre le premier tag (genre principal)
    const mainTag = tagData.toptags.tag[0].name;

    // Récupérer les top tracks de ce tag
    const trackUrl = `https://ws.audioscrobbler.com/2.0/?method=tag.gettoptracks&tag=${encodeURIComponent(mainTag)}&api_key=${getLastFmKey()}&format=json&limit=30`;
    const trackResponse = await fetch(trackUrl);
    const trackData = await trackResponse.json();

    if (trackData.tracks && trackData.tracks.track) {
      // Filtrer pour ne pas retourner le même artiste
      return trackData.tracks.track
        .filter((t) => t.artist.name.toLowerCase() !== artist.toLowerCase())
        .map((t) => ({
          artist: t.artist.name,
          title: t.name,
          match: 0.8,
        }));
    }
  } catch (e) {
    console.error("Last.fm same genre error:", e);
  }
  return [];
}

/**
 * Générateur de suggestions Last.fm - retourne une suggestion à la fois
 * Économise les requêtes en ne cherchant que ce qui est nécessaire
 */
async function* getNextSuggestion(artist, title, excludeTitles = []) {
  const excludeLower = excludeTitles.map((t) => t.toLowerCase());

  const isExcluded = (a, t) => {
    const titleLower = t.toLowerCase();
    const artistLower = a.toLowerCase();
    // Exclure si même artiste+titre ou si titre déjà dans playlist
    if (
      artist &&
      title &&
      artistLower === artist.toLowerCase() &&
      titleLower === title.toLowerCase()
    )
      return true;
    return excludeLower.some(
      (ex) => ex.includes(titleLower) || titleLower.includes(ex),
    );
  };

  // 1. Tracks similaires (meilleure qualité)
  if (artist && title) {
    try {
      const url = `https://ws.audioscrobbler.com/2.0/?method=track.getsimilar&artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(title)}&api_key=${getLastFmKey()}&format=json&limit=20`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.similartracks && data.similartracks.track) {
        for (const t of data.similartracks.track) {
          if (!isExcluded(t.artist.name, t.name)) {
            yield { artist: t.artist.name, title: t.name, source: "similar" };
          }
        }
      }
    } catch (e) {
      console.error("Last.fm similar tracks error:", e);
    }
  }

  // 2. Top tracks de l'artiste
  if (artist) {
    try {
      const url = `https://ws.audioscrobbler.com/2.0/?method=artist.gettoptracks&artist=${encodeURIComponent(artist)}&api_key=${getLastFmKey()}&format=json&limit=15`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.toptracks && data.toptracks.track) {
        for (const t of data.toptracks.track) {
          if (!isExcluded(t.artist.name, t.name)) {
            yield { artist: t.artist.name, title: t.name, source: "top" };
          }
        }
      }
    } catch (e) {
      console.error("Last.fm top tracks error:", e);
    }

    // 3. Artistes similaires - top track de chacun
    try {
      const url = `https://ws.audioscrobbler.com/2.0/?method=artist.getsimilar&artist=${encodeURIComponent(artist)}&api_key=${getLastFmKey()}&format=json&limit=10`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.similarartists && data.similarartists.artist) {
        for (const simArtist of data.similarartists.artist) {
          // Récupérer juste le top 1 de chaque artiste similaire
          try {
            const topUrl = `https://ws.audioscrobbler.com/2.0/?method=artist.gettoptracks&artist=${encodeURIComponent(simArtist.name)}&api_key=${getLastFmKey()}&format=json&limit=3`;
            const topResponse = await fetch(topUrl);
            const topData = await topResponse.json();

            if (topData.toptracks && topData.toptracks.track) {
              for (const t of topData.toptracks.track) {
                if (!isExcluded(t.artist.name, t.name)) {
                  yield {
                    artist: t.artist.name,
                    title: t.name,
                    source: "similar-artist",
                  };
                }
              }
            }
          } catch (e) {
            // Ignorer les erreurs individuelles
          }
        }
      }
    } catch (e) {
      console.error("Last.fm similar artists error:", e);
    }
  }
}
