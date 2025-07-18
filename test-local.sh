#!/bin/bash

echo "🧪 Test en mode local avec fichiers locaux"

# Set environment variables for local testing
export USE_LOCAL_FILES=true
export NODE_ENV=development

# Start the server
echo "🚀 Démarrage du serveur en mode test local..."
npm run server