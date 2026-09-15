const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const tasksRouter = require('./routes/tasks');

const app = express();
const PORT = Number(process.env.PORT) || 5000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.get('/', (req, res) => {
  res.json({
    message: 'Mini-Trello API running',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'fallback-mode',
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'fallback-mode',
    port: PORT,
  });
});

app.use('/api/tasks', tasksRouter);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

async function connectDatabase() {
  if (!process.env.MONGODB_URI) {
    console.warn('MONGODB_URI missing in backend/.env. Running in fallback mode.');
    return false;
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('Connected to MongoDB Atlas');
    return true;
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    console.warn('Continuing in fallback mode so the API stays available after restart.');
    return false;
  }
}

async function startServer(port = PORT) {
  await connectDatabase();

  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      console.log(`Server running on port ${port}`);
      resolve(server);
    });

    server.on('error', (err) => {
      console.error('Failed to start server:', err);
      reject(err);
    });
  });
}

if (require.main === module) {
  startServer().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

module.exports = { app, startServer, connectDatabase };