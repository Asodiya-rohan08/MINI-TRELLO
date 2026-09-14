const backendServer = require('./backend/server');

const httpPort = Number(process.env.PORT) || 5000;

backendServer.startServer(httpPort).catch((err) => {
  console.error('Failed to start backend server from project root:', err);
  process.exit(1);
});
