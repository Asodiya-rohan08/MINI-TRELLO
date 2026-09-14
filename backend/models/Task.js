const mongoose = require('mongoose');cd ..cd ..cd ..

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['todo', 'in_progress', 'done'],
    default: 'todo',
  },
  created_by: {
    type: String,
    default: '',
  },
}, { timestamps: true });

module.exports = mongoose.model('Task', taskSchema);