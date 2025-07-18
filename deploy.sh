#!/bin/bash

# Script de déploiement pour le serveur de streaming

echo "🚀 Déploiement du serveur de streaming..."

# Copier les fichiers vers le serveur
echo "📁 Copie des fichiers vers le serveur..."
rsync -av --exclude node_modules --exclude .git . thim@ssh.thimotefetu.fr:~/streaming/

# Se connecter au serveur et déployer
echo "🐳 Construction et démarrage des conteneurs..."
ssh thim@ssh.thimotefetu.fr << 'EOF'
cd ~/streaming

# Arrêter les conteneurs existants
docker-compose down

# Construire et démarrer les nouveaux conteneurs
docker-compose up -d --build

# Afficher les logs
docker-compose logs -f --tail=50
EOF

echo "✅ Déploiement terminé!"
echo "🌐 Votre application est disponible à: http://ssh.thimotefetu.fr"