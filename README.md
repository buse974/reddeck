# 💿 RedDeck - DJ Mixer en Ligne

Un DJ mixer gratuit et open source directement dans votre navigateur. Mixez vos vidéos YouTube comme un pro avec des fonctionnalités professionnelles accessibles à tous.

**🌐 En ligne** : [altstud.io/dj](https://altstud.io/dj/)  
**📝 Licence** : MIT  
**🚀 Version** : 3.42.0

---

## ✨ Fonctionnalités

### 🎛️ Double Platines Virtuelles
- Deux decks virtuels avec vinyles animés
- Contrôles complets (volume, tempo, EQ)
- VU-mètres en temps réel
- Mode de lecture fluide

### 🔀 Crossfader Intelligent
- Transition manuelle ou automatique
- Durée configurable du crossfade
- Lissage progressif des transitions
- Synchronisation parfaite des tempos

### 🤖 Auto-Mix
- Mode automatique pour chaîner les morceaux
- Détection intelligente des points de transition
- Transitions fluides sans intervention
- Idéal pour les DJ sets longue durée

### ✨ Suggestions Intelligentes
- Basées sur Last.fm
- Recommandations adaptées à votre goût
- Découvrez des morceaux similaires
- Enrichissez votre playlist en continu

### 📺 Mode TV
- Diffusez sur un second écran
- Vidéo en fullscreen sur la TV
- Contrôles maintenus sur votre ordinateur
- Parfait pour les événements

### 📱 100% Web
- Aucune installation requise
- Fonctionne sur tous les navigateurs modernes
- Chrome, Firefox, Edge, Safari
- Desktop, tablet, mobile

---

## 🏗️ Architecture

```
RedDeck/
├── index.html           # Page d'accueil & landing
├── app.html             # Interface du mixer
├── tv.html              # Mode TV dual screen
├── css/
│   ├── style.css        # Styles principaux
│   └── tv.css           # Styles mode TV
├── js/
│   ├── app.js           # Point d'entrée principal
│   ├── player.js        # Gestion du lecteur YouTube
│   ├── mixer.js         # Logique du mixer (crossfader, tempo)
│   ├── ui.js            # Mise à jour de l'interface
│   ├── playlist.js      # Gestion de la playlist
│   ├── storage.js       # Sauvegarde locale (localStorage)
│   ├── state.js         # Gestion d'état centralisée
│   ├── faders.js        # Contrôle des faders
│   ├── vu-meter.js      # Affichage des VU-mètres
│   ├── youtube.js       # Intégration YouTube API
│   ├── lastfm.js        # Intégration Last.fm API
│   └── suggestions.js   # Suggestions intelligentes
├── package.json         # Dépendances Node
└── build.js             # Script de build (minification)
```

---

## 🛠️ Technologies

- **Frontend** : HTML5, CSS3, Vanilla JavaScript
- **API** : YouTube Data API v3, Last.fm API
- **Build** : Terser (minification)
- **Stockage** : LocalStorage (sauvegarde client)

---

## 🚀 Installation & Développement

### Prérequis
- Node.js 14+ (pour le build uniquement)
- Navigateur moderne (Chrome 60+, Firefox 55+, Edge 79+)

### Cloner le dépôt
```bash
git clone https://github.com/buse974/reddeck.git
cd reddeck
```

### Configuration des clés API

#### Méthode 1 : Via fichier `.env` (Recommandé pour le développement)

1. Copiez `.env.example` en `.env`
   ```bash
   cp .env.example .env
   ```

2. Éditez le fichier `.env` et remplissez vos clés API :
   ```
   YOUTUBE_API_KEY=ta_cle_youtube_ici
   LASTFM_API_KEY=ta_cle_lastfm_ici
   ```

3. Le fichier `.env` est ignoré par git (ne sera jamais commité)

#### Méthode 2 : Via l'interface (Pour tous les environnements)

1. Lancez l'application
2. Cliquez sur ⚙️ Paramètres en haut à droite
3. Entrez vos clés API dans les champs
4. Les clés sont sauvegardées localement (localStorage)

#### Obtenir vos clés API

**YouTube Data API v3**
1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créez un nouveau projet
3. Activez "YouTube Data API v3"
4. Créez une clé API (Credentials > Create Credentials > API Key)
5. Copiez votre clé

**Last.fm API**
1. Allez sur [Last.fm Developer](https://www.last.fm/api/)
2. Créez une application
3. Copiez votre clé API
4. *Note: La clé est restreinte au domaine pour la sécurité*

### Lancer en développement

```bash
# Serveur local (Python 3)
python -m http.server 8000

# Ou avec Node
npx http-server

# Puis ouvrez http://localhost:8000/app.html
```

### Build pour la production

```bash
npm run build

# Fichiers minifiés générés dans /build
npm run deploy  # Upload FTP si configuré
```

---

## 📖 Guide d'Utilisation

### Interface Principale

1. **Playlist** : Zone gauche pour ajouter/gérer les morceaux
2. **Deck Gauche** : Première platine (Play, Volume, Tempo)
3. **Deck Droit** : Deuxième platine (Play, Volume, Tempo)
4. **Crossfader** : Barre centrale pour mixer les deux decks
5. **VU-Mètres** : Affichage du niveau sonore en temps réel

### Workflow Typique

1. **Charger des morceaux** : Ajoutez des vidéos YouTube à votre playlist
2. **Commencer** : Lancez la lecture sur le Deck Gauche
3. **Anticiper** : Chargez le morceau suivant sur le Deck Droit
4. **Mixer** : Déplacez le crossfader pour passer d'un deck à l'autre
5. **Auto-Mix** : Activez le mode automatique pour chaîner sans intervention

### Raccourcis Clavier

- `Space` : Play/Pause (deck actif)
- `← →` : Contrôler le crossfader
- `+ -` : Ajuster le volume
- `↑ ↓` : Modifier le tempo (±1%)

---

## 🔧 Configuration

### LocalStorage

Les préférences sont sauvegardées automatiquement :
- Playlist actuelle
- Paramètres du mixer (crossfade duration)
- Clés API (stockées localement, jamais envoyées au serveur)
- Historique des morceaux joués

### Variables d'Environnement

Aucune variable d'environnement requise. Tout est configuré via l'interface.

---

## 📡 API Utilisées

### YouTube Data API
- Recherche de vidéos musicales
- Récupération des métadonnées (titre, artiste, durée)
- Intégration du lecteur YouTube

### Last.fm API
- Récupération de morceaux similaires
- Suggestions basées sur les goûts de l'utilisateur
- Données d'écoute (optionnel)

---

## 🐛 Dépannage

### Le mixer ne joue aucun son
- Vérifiez le volume de votre navigateur
- Assurez-vous que YouTube n'est pas bloqué
- Essayez de recharger la page

### Les suggestions ne fonctionnent pas
- Vérifiez votre clé Last.fm
- Assurez-vous d'avoir des morceaux dans votre playlist
- Vérifiez la console pour les erreurs (F12)

### Le crossfader ne répond pas
- Rafraîchissez la page
- Vérifiez que JavaScript est activé
- Essayez un autre navigateur

---

## 🤝 Contribution

Les contributions sont les bienvenues ! Pour contribuer :

1. **Fork** le dépôt
2. **Créez une branche** : `git checkout -b feature/ma-feature`
3. **Committez** vos changements : `git commit -m "Ajoute ma feature"`
4. **Push** : `git push origin feature/ma-feature`
5. **Créez une Pull Request**

### Areas à améliorer
- Support du drag-and-drop pour la playlist
- Enregistrement des sessions
- Visualiseur audio avancé
- Support du mix en multi-deck (3+ platines)
- Thèmes personnalisés

---

## 📄 Licence

Ce projet est sous licence **MIT**. Vous êtes libre de l'utiliser, le modifier et le distribuer.

Voir [LICENSE](LICENSE) pour plus de détails.

---

## 👨‍💻 Auteur

Développé avec passion et l'assistance d'[Claude AI](https://claude.ai/)

- **GitHub** : [buse974](https://github.com/buse974)
- **Site** : [altstud.io](https://altstud.io/)

---

## 🙏 Remerciements

- [YouTube](https://www.youtube.com/) pour l'API
- [Last.fm](https://www.last.fm/) pour les suggestions musicales
- [Anthropic](https://www.anthropic.com/) pour Claude AI

---

## 📊 Statistiques

- **Fichiers** : 33 fichiers source (HTML, CSS, JS)
- **Lignes de code** : ~2000+ lignes JavaScript
- **Taille minifiée** : ~80KB (app.js minifié)
- **Dépendances** : 0 dépendances runtime (dev only)

---

## 🔐 Sécurité

- ✅ Aucune donnée personnelle stockée
- ✅ Les clés API restent locales (localStorage)
- ✅ HTTPS recommandé
- ✅ Code auditable (open source)

---

## 📞 Support

- **Issues** : [GitHub Issues](https://github.com/buse974/reddeck/issues)
- **Discussions** : [GitHub Discussions](https://github.com/buse974/reddeck/discussions)
- **Email** : [contact@altstud.io](mailto:contact@altstud.io)

---

## 🌟 Vous aimez RedDeck ?

⭐ N'hésitez pas à mettre une star sur GitHub ! Ça nous aide beaucoup.

Amusez-vous bien à mixer ! 🎧
