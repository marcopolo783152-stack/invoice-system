const express = require('express');
const path = require('path');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable gzip compression
app.use(compression());

// Serve static files from 'out' directory
app.use(express.static(path.join(__dirname, 'out'), {
  maxAge: '1d',
  etag: true,
  index: 'index.html'
}));

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🎉 Invoice System Server Running Successfully!          ║
║                                                            ║
║   📍 Local:    http://localhost:${PORT}                       ║
║   🌐 Network:  http://YOUR_IP:${PORT}                        ║
║                                                            ║
║   📱 Access from any device on your network                ║
║   💾 Data stored in browser localStorage                   ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
  
  // Get local IP address
  const networkInterfaces = require('os').networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(networkInterfaces)) {
    for (const net of networkInterfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push(net.address);
      }
    }
  }
  
  if (addresses.length > 0) {
    console.log(`   🔗 Access from other devices: http://${addresses[0]}:${PORT}\n`);
  }
});

// Error handling
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});
