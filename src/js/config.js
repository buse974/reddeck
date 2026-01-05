/**
 * Configuration - Gestion des variables d'environnement
 * Charge les clés API depuis .env ou localStorage
 */

const Config = (() => {
  // Récupérer depuis localStorage (interface utilisateur)
  // ou depuis les variables globales définies dans .env

  return {
    /**
     * Récupère la clé API YouTube
     * @returns {string} La clé API YouTube
     */
    getYouTubeApiKey: () => {
      // D'abord vérifier localStorage (préférence utilisateur)
      const stored = localStorage.getItem('YOUTUBE_API_KEY');
      if (stored) return stored;

      // Sinon, vérifier si elle est définie globalement (chargée depuis .env)
      if (window.ENV && window.ENV.YOUTUBE_API_KEY) {
        return window.ENV.YOUTUBE_API_KEY;
      }

      return null;
    },

    /**
     * Récupère la clé API Last.fm
     * @returns {string} La clé API Last.fm
     */
    getLastFmApiKey: () => {
      // D'abord vérifier localStorage
      const stored = localStorage.getItem('LASTFM_API_KEY');
      if (stored) return stored;

      // Sinon, vérifier si elle est définie globalement
      if (window.ENV && window.ENV.LASTFM_API_KEY) {
        return window.ENV.LASTFM_API_KEY;
      }

      return null;
    },

    /**
     * Définir la clé API YouTube (stockage localStorage)
     * @param {string} key La clé API
     */
    setYouTubeApiKey: (key) => {
      localStorage.setItem('YOUTUBE_API_KEY', key);
    },

    /**
     * Définir la clé API Last.fm (stockage localStorage)
     * @param {string} key La clé API
     */
    setLastFmApiKey: (key) => {
      localStorage.setItem('LASTFM_API_KEY', key);
    },

    /**
     * Vérifie si les clés API sont configurées
     * @returns {object} Statut de chaque clé
     */
    getStatus: () => {
      return {
        youtube: !!this.getYouTubeApiKey(),
        lastfm: !!this.getLastFmApiKey()
      };
    },

    /**
     * Efface une clé API
     * @param {string} key 'youtube' ou 'lastfm'
     */
    clearApiKey: (key) => {
      if (key === 'youtube') {
        localStorage.removeItem('YOUTUBE_API_KEY');
      } else if (key === 'lastfm') {
        localStorage.removeItem('LASTFM_API_KEY');
      }
    }
  };
})();
