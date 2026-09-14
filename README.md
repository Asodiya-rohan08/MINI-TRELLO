# Mini-Trello Kanban Board

A full-stack Kanban board application built with Node.js, Express, MongoDB Atlas, and Vanilla JS.

## Project Structure

```
/AGILE PROJECT/
├── /backend/          # Node.js + Express API
│   ├── server.js      # Express app entry point
│   ├── models/Task.js # Mongoose task schema
│   ├── routes/tasks.js # REST API routes
│   ├── .env.example  # Environment variables example
│   └── package.json   # npm dependencies
├── /frontend/         # Static frontend files
│   ├── index.html     # HTML markup
│   ├── style.css      # UI styling with color scheme
│   └── script.js      # Fetch calls & UI logic
├── .gitignore         # Git ignore file
└── README.md          # This file
```

## Prerequisites

- Node.js (v14 or higher)
- MongoDB Atlas account and cluster
- npm or yarn

## Setup Instructions

### 1. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` directory:

```
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/kanban
PORT=5000
```

Replace the `MONGODB_URI` value with your MongoDB Atlas connection string.

### 2. Frontend Setup

No installation required for the frontend. Ensure the backend is running, then open `frontend/index.html` in your browser.

Or use a simple server:
```bash
cd frontend
npx serve   # or python -m http.server
```

### 3. Run the Application

Start the backend server:
```bash
cd backend
npm run dev   # or: node server.js
```

The server will run on `http://localhost:5000` and connect to MongoDB Atlas.

Open your browser to `http://localhost:5000` (or open `frontend/index.html` directly).

## API Endpoints

| Method | Endpoint         | Description               |
|--------|------------------|---------------------------|
| GET    | `/api/tasks`     | Retrieve all tasks        |
| POST   | `/api/tasks`     | Create a new task         |
| PUT    | `/api/tasks/:id` | Update a task             |
| DELETE | `/api/tasks/:id` | Delete a task             |

## Features

- **CRUD Operations**: Create, read, update, and delete tasks
- **Real-time Updates**: Tasks persist to MongoDB and update instantly
- **Task Movement**: Move tasks between To Do → In Progress → Done columns
- **Progress Tracking**: Overall completion percentage calculated live
- **Responsive Design**: Works on desktop and mobile devices
- **Error Handling**: Visible error messages for failed API calls
- **Dark/Light Mode**: Toggle between themes

## Color Scheme

- **Primary Gradient**: `linear-gradient(135deg, #6C63FF 0%, #4F8EF7 50%, #C86DD7 100%)`
- **Background**: `#FAFAFA` (very light gray) / white
- **TO DO Column**: `#F3F4F6` (light gray)
- **IN PROGRESS Column**: `#DBEAFE` (light blue)
- **DONE Column**: `#D1FAE5` (light green)
- **Task Cards**: White with colored left borders matching status
- **CTA Button Gradient**: Same as primary gradient
- **Progress Bars**: Primary gradient fill