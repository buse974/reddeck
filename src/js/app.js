/**
 * YouTube DJ Mixer - Main App
 * Point d'entrée et initialisation
 */

// Initialisation au chargement du DOM
document.addEventListener("DOMContentLoaded", () => {
  // Charger la playlist sauvegardée
  loadPlaylistFromStorage();

  // Initialiser les event listeners
  initializeEventListeners();

  // Charger le mode playlist (repeat/dj)
  loadPlaylistMode();

  // Générer les barres de waveform
  generateWaveformBars();

  // Démarrer la boucle de mise à jour
  startUpdateLoop();

  // Configurer les handles de redimensionnement
  setupResizeHandle();
  setupResizeHandleH();

  // Afficher la playlist chargée
  updatePlaylistUI();

  // Afficher les clés API
  updateApiKeysUI();
  updateApiKeyStatus();

  // Vérifier si une clé API est configurée
  checkApiKeyStatus();
});
