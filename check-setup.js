#!/usr/bin/env node

const http = require('http');
const fs = require('fs');

console.log('🔍 Local File Search - Setup Check\n');

// Check if .env file exists
if (!fs.existsSync('.env')) {
  console.log('❌ .env file not found');
  console.log('💡 Copy env.example to .env and update with your credentials');
  console.log('   cp env.example .env\n');
  process.exit(1);
}

// Load environment variables
require('dotenv').config();

const esNode = process.env.ELASTICSEARCH_NODE || 'http://localhost:9200';
const esUsername = process.env.ELASTICSEARCH_USERNAME;
const esPassword = process.env.ELASTICSEARCH_PASSWORD;
const esApiKey = process.env.ELASTICSEARCH_API_KEY;
const port = process.env.PORT || 3000;

console.log('📋 Configuration:');
console.log(`   Elasticsearch: ${esNode}`);
console.log(`   App Port: ${port}`);
console.log(`   Auth: ${esApiKey ? 'API Key' : (esUsername ? 'Username/Password' : 'None')}\n`);

// Check Elasticsearch connection
console.log('🔗 Testing Elasticsearch connection...');

const url = new URL(esNode);
const options = {
  hostname: url.hostname,
  port: url.port || (url.protocol === 'https:' ? 443 : 80),
  path: '/',
  method: 'GET',
  headers: {}
};

if (esApiKey) {
  options.headers['Authorization'] = `ApiKey ${esApiKey}`;
} else if (esUsername && esPassword) {
  options.headers['Authorization'] = `Basic ${Buffer.from(`${esUsername}:${esPassword}`).toString('base64')}`;
}

const req = http.request(options, (res) => {
  console.log(`✅ Elasticsearch responding (status: ${res.statusCode})`);
  if (res.statusCode === 200) {
    console.log('✅ Authentication successful');
  } else if (res.statusCode === 401) {
    console.log('❌ Authentication failed - check your credentials');
  }
  console.log('\n🚀 Setup looks good! Run: npm run dev');
});

req.on('error', (error) => {
  console.log('❌ Cannot connect to Elasticsearch');
  console.log(`   Error: ${error.message}`);
  console.log('\n💡 Troubleshooting:');
  console.log('   1. Run: curl -fsSL https://elastic.co/start-local | sh');
  console.log('   2. Check your .env file has correct ELASTICSEARCH_NODE');
  console.log('   3. Verify credentials from start-local output');
});

req.end();
