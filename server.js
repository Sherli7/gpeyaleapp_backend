require('dotenv').config();
const http = require('http');
const app = require('./src/app');

const PORT = process.env.PORT || 3003;

const server = http.createServer(app);

server.listen(PORT, () => {
  const env = process.env.NODE_ENV || 'development';
  console.log(`[server] Listening on port ${PORT} (env=${env})`);
});
