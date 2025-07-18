# Streaming App

Une application de streaming vidéo construite avec React et Node.js.

## Déploiement automatique

### 1. Configuration GitHub Actions

Dans votre dépôt GitHub, ajoutez ces secrets (Settings > Secrets and variables > Actions) :

- `HOST`: `ssh.thimotefetu.fr`
- `USERNAME`: `thim`
- `SSH_KEY`: Votre clé privée SSH (contenu de `~/.ssh/id_rsa`)
- `PORT`: `22`

### 2. Déploiement

**Aucun script à exécuter !** Tout est automatique :

1. **Push sur `main`** → Déploiement automatique
2. **Déploiement manuel** → Cliquez sur "Actions" → "Run workflow"

La pipeline installe automatiquement :
- ✅ Docker & Docker Compose
- ✅ Node.js
- ✅ Dependencies
- ✅ Build & Deploy

### 3. Configuration DNS (obligatoire)

Ajoutez un enregistrement DNS pour le sous-domaine :
- **Type** : A ou CNAME
- **Nom** : `streaming`
- **Valeur** : IP de votre serveur ou `ssh.thimotefetu.fr`

### 4. Accès

- **Application**: `http://streaming.thimotefetu.fr` (Cloudflare DNS → port 7000)
- **Fichiers média**: `http://streaming.thimotefetu.fr/media/`
- **API directe**: `http://streaming.thimotefetu.fr:3001`

*Note: Le certificat SSL sera automatiquement généré lors du premier déploiement*

## Développement local

```bash
# Installation
npm install

# Test avec fichiers locaux
USE_LOCAL_FILES=true npm run server

# Dans un autre terminal
npm run dev
```

## Architecture

- **Frontend**: React + Vite
- **Backend**: Node.js + Express
- **Streaming**: Nginx pour les fichiers statiques
- **Déploiement**: Docker + Docker Compose
- **CI/CD**: GitHub Actions

## Structure des fichiers

```
/mnt/streaming/
├── Films/
├── Séries/
└── Musiques/
```