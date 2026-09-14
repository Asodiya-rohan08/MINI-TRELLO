const express = require('express');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const router = express.Router();
const Task = require('../models/Task');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'tasks.json');

function ensureDataFile() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, '[]', 'utf8');
  }
}

function readFileTasks() {
  ensureDataFile();
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to read task data file:', err.message);
    return [];
  }
}

function writeFileTasks(tasks) {
  ensureDataFile();
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(tasks, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Failed to write task data file:', err.message);
    return false;
  }
}

function sortTasks(tasks) {
  return [...tasks].sort((a, b) => new Date(b.createdAt || b.updatedAt || 0) - new Date(a.createdAt || a.updatedAt || 0));
}

function getTaskStore() {
  return mongoose.connection.readyState === 1 ? 'mongo' : 'file';
}

function sanitizeTask(task) {
  return {
    ...task,
    _id: task._id || task.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    createdAt: task.createdAt || new Date().toISOString(),
    updatedAt: task.updatedAt || new Date().toISOString(),
  };
}

function fetchFileTaskById(id) {
  const tasks = readFileTasks();
  return tasks.find((task) => String(task._id || task.id) === String(id));
}

// GET all tasks
router.get('/', async (req, res) => {
  try {
    if (getTaskStore() === 'file') {
      const tasks = readFileTasks();
      return res.json(sortTasks(tasks));
    }

    const tasks = await Task.find().sort({ createdAt: -1 });
    return res.json(tasks);
  } catch (err) {
    console.error('GET /api/tasks failed:', err.message);
    return res.status(500).json({ message: err.message });
  }
});

// POST create a task
router.post('/', async (req, res) => {
  try {
    if (getTaskStore() === 'file') {
      const tasks = readFileTasks();
      const task = sanitizeTask({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        title: req.body.title,
        description: req.body.description,
        status: req.body.status || 'todo',
        created_by: req.body.created_by || '',
      });
      tasks.unshift(task);
      const ok = writeFileTasks(tasks);
      if (!ok) {
        return res.status(500).json({ message: 'Failed to save task to persistent storage.' });
      }
      return res.status(201).json(task);
    }

    const task = new Task({
      title: req.body.title,
      description: req.body.description,
      status: req.body.status || 'todo',
      created_by: req.body.created_by || '',
    });

    const newTask = await task.save();
    return res.status(201).json(newTask);
  } catch (err) {
    console.error('POST /api/tasks failed:', err.message);
    return res.status(400).json({ message: err.message });
  }
});

// PUT update a task (supports partial update, e.g. { status } for move)
router.put('/:id', async (req, res) => {
  try {
    if (getTaskStore() === 'file') {
      const tasks = readFileTasks();
      const taskIndex = tasks.findIndex((task) => String(task._id || task.id) === String(req.params.id));
      if (taskIndex === -1) return res.status(404).json({ message: 'Task not found' });

      const updatedTask = sanitizeTask({
        ...tasks[taskIndex],
        ...req.body,
        updatedAt: new Date().toISOString(),
      });

      tasks[taskIndex] = updatedTask;
      const ok = writeFileTasks(tasks);
      if (!ok) {
        return res.status(500).json({ message: 'Failed to update task in persistent storage.' });
      }
      return res.json(updatedTask);
    }

    const allowed = ['title', 'description', 'status', 'created_by'];
    const updates = {};
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    });

    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );
    if (!updatedTask) return res.status(404).json({ message: 'Task not found' });
    return res.json(updatedTask);
  } catch (err) {
    console.error('PUT /api/tasks/:id failed:', err.message);
    return res.status(400).json({ message: err.message });
  }
});

// DELETE a task
router.delete('/:id', async (req, res) => {
  try {
    if (getTaskStore() === 'file') {
      const tasks = readFileTasks();
      const taskIndex = tasks.findIndex((task) => String(task._id || task.id) === String(req.params.id));
      if (taskIndex === -1) return res.status(404).json({ message: 'Task not found' });

      tasks.splice(taskIndex, 1);
      const ok = writeFileTasks(tasks);
      if (!ok) {
        return res.status(500).json({ message: 'Failed to delete task in persistent storage.' });
      }
      return res.json({ message: 'Task deleted' });
    }

    await Task.findByIdAndDelete(req.params.id);
    return res.json({ message: 'Task deleted' });
  } catch (err) {
    console.error('DELETE /api/tasks/:id failed:', err.message);
    return res.status(500).json({ message: err.message });
  }
});

module.exports = router;