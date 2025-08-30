#!/usr/bin/env node

const http = require('http');

// Configuration
const API_URL = 'http://localhost:3003';
const TEST_ORIGINS = [
  'http://localhost:4200',
  'http://localhost:3000',
  'http://localhost:5173',
  'https://gpe-yale.edocsflow.com',
  'https://www.gpe-yale.edocsflow.com',
  'http://malicious-site.com' // Pour tester le rejet
];

function testCORS(origin) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3003,
      path: '/api/candidatures',
      method: 'OPTIONS',
      headers: {
        'Origin': origin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        const corsHeaders = {
          'Access-Control-Allow-Origin': res.headers['access-control-allow-origin'],
          'Access-Control-Allow-Methods': res.headers['access-control-allow-methods'],
          'Access-Control-Allow-Headers': res.headers['access-control-allow-headers']
        };
        
        resolve({
          origin,
          statusCode: res.statusCode,
          corsHeaders,
          body: data
        });
      });
    });

    req.on('error', (err) => {
      reject({ origin, error: err.message });
    });

    req.end();
  });
}

async function runTests() {
  console.log('🧪 Test de configuration CORS\n');
  console.log(`API URL: ${API_URL}\n`);

  for (const origin of TEST_ORIGINS) {
    try {
      const result = await testCORS(origin);
      
      if (result.statusCode === 200) {
        console.log(`✅ ${origin} - AUTORISÉ`);
        console.log(`   Headers CORS:`, result.corsHeaders);
      } else {
        console.log(`❌ ${origin} - REJETÉ (${result.statusCode})`);
        if (result.body) {
          console.log(`   Réponse:`, result.body);
        }
      }
    } catch (error) {
      console.log(`❌ ${origin} - ERREUR: ${error.error}`);
    }
    console.log('');
  }

  console.log('📝 Test terminé');
}

// Vérifier si l'API est accessible
function checkAPIHealth() {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3003,
      path: '/health',
      method: 'GET'
    }, (res) => {
      resolve(res.statusCode === 200);
    });

    req.on('error', () => {
      resolve(false);
    });

    req.end();
  });
}

async function main() {
  console.log('🔍 Vérification de l\'API...');
  const isHealthy = await checkAPIHealth();
  
  if (!isHealthy) {
    console.log('❌ L\'API n\'est pas accessible sur http://localhost:3003');
    console.log('   Assurez-vous que l\'application est démarrée avec Docker');
    console.log('   Commande: ./deploy.sh dev start');
    process.exit(1);
  }

  console.log('✅ API accessible\n');
  await runTests();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testCORS, checkAPIHealth };
