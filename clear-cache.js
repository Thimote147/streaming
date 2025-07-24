#!/usr/bin/env node

// Script pour vider tous les caches de l'application streaming
console.log('🧹 Nettoyage des caches...');

// 1. Vider les caches serveur (via redémarrage)
const { exec } = require('child_process');
const path = require('path');

// Fonction pour exécuter une commande
function runCommand(command, description) {
  return new Promise((resolve, reject) => {
    console.log(`📌 ${description}...`);
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Erreur: ${error.message}`);
        reject(error);
        return;
      }
      if (stderr) {
        console.log(`⚠️  ${stderr}`);
      }
      if (stdout) {
        console.log(`✅ ${stdout}`);
      }
      resolve();
    });
  });
}

async function clearCaches() {
  try {
    // 1. Redémarrer le serveur pour vider les caches en mémoire
    console.log('🔄 Redémarrage du serveur pour vider les caches...');
    
    // 2. Créer un endpoint temporaire pour vider les caches
    console.log('💡 Solution : Ajouter un endpoint /api/clear-cache au serveur');
    console.log('📋 Instructions:');
    console.log('   1. Redémarre le serveur: npm start ou pm2 restart streaming');
    console.log('   2. Ou visite: http://localhost:3001/api/clear-cache');
    console.log('   3. Ou utilise: curl http://localhost:3001/api/clear-cache');
    
    // 3. Instructions pour vider le cache client
    console.log('🌐 Pour vider le cache client (navigateur):');
    console.log('   1. F12 > Application > Storage > Clear all');
    console.log('   2. Ou Ctrl+Shift+R (hard refresh)');
    console.log('   3. Ou dans la console: localStorage.clear(); sessionStorage.clear();');
    
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage:', error);
  }
}

clearCaches();