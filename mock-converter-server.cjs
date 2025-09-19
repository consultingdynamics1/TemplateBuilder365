/**
 * Mock Converter API Server for Development
 * Simulates the Lambda conversion functionality locally
 */

const http = require('http');
const { URL } = require('url');
const { convertTB365ToHTML } = require('./shared/tb365-converter.cjs');

// Create HTTP server
const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === 'GET' && parsedUrl.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      service: 'mock-tb365-converter',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    }));
    return;
  }

  if (req.method === 'POST' && parsedUrl.pathname === '/convert') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const requestData = JSON.parse(body);
        console.log('Converting TB365 data:', {
          project: requestData.tb365Data?.projectName,
          elements: requestData.tb365Data?.canvasState?.elements?.length
        });

        // Use shared conversion library (single source of truth)
        const response = convertTB365ToHTML(
          requestData.tb365Data,
          requestData.data || {},
          requestData.options || {}
        );

        // Add mock prefix to conversion ID
        response.conversionId = `mock-${response.conversionId}`;

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response));

        console.log('✅ Mock conversion completed:', response.conversionId);
      } catch (error) {
        console.error('❌ Mock conversion error:', error.message);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: 'Conversion failed',
          message: error.message,
          timestamp: new Date().toISOString()
        }));
      }
    });
    return;
  }

  // 404 for other routes
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`🚀 Mock TB365 Converter API running on http://localhost:${PORT}`);
  console.log('📋 Available endpoints:');
  console.log('  GET  /health  - Health check');
  console.log('  POST /convert - TB365 to HTML conversion');
});