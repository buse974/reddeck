/**
 * Env Loader - Charge le fichier .env en développement
 * En production, utilise les variables définies côté serveur
 */

(async () => {
  // Vérifier si on est en développement
  const isDev =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.startsWith('192.168.');

  if (isDev) {
    try {
      // Charger le fichier .env
      const response = await fetch('.env');
      if (!response.ok) {
        console.warn('Fichier .env non trouvé. Les clés API doivent être configurées dans l\'interface.');
        return;
      }

      const envContent = await response.text();

      // Parser le fichier .env
      window.ENV = {};
      envContent.split('\n').forEach(line => {
        // Ignorer les commentaires et lignes vides
        if (!line || line.startsWith('#')) return;

        const [key, ...valueParts] = line.split('=');
        const value = valueParts.join('=').trim();

        if (key && value) {
          window.ENV[key.trim()] = value.replace(/^["']|["']$/g, '');
        }
      });

      if (Object.keys(window.ENV).length > 0) {
        console.log('✅ Variables d\'environnement chargées depuis .env');
      }
    } catch (error) {
      console.warn('Erreur lors du chargement du .env:', error);
    }
  }
})();
