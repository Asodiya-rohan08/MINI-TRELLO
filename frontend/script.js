document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5000'
    : window.location.origin;
  const STATUSES = ['todo', 'in_progress', 'done'];
  const STATUS_LABEL = { todo: 'TO DO', in_progress: 'IN PROGRESS', done: 'DONE' };

  let tasks = [];
  let currentView = 'board';
  let searchQuery = '';
  let editingId = null;

  const taskForm = document.getElementById('task-form');
  const taskModal = document.getElementById('task-modal');
  const modalClose = document.querySelector('.modal-close');
  const modalCancel = document.getElementById('modal-cancel');
  const modalTitle = document.getElementById('modal-title');
  const modalSubmit = document.getElementById('modal-submit');
  const ctaButton = document.querySelector('.cta-button');
  const toastWrap = document.getElementById('toast-wrap');
  const searchInput = document.getElementById('search-input');
  const boardView = document.getElementById('board-view');
  const tableView = document.getElementById('table-view');
  const tableBody = document.getElementById('table-body');
  const emptyTable = document.getElementById('empty-table');

  const columns = {
    todo: document.getElementById('todo-column'),
    in_progress: document.getElementById('in-progress-column'),
    done: document.getElementById('done-column'),
  };

  const taskCounts = {
    todo: document.querySelector('.column.todo .task-count'),
    in_progress: document.querySelector('.column.in-progress .task-count'),
    done: document.querySelector('.column.done .task-count'),
  };

  const progressBar = document.querySelector('.progress-bar');
  const progressPercentage = document.querySelector('.progress-percentage');
  const toggleBtns = document.querySelectorAll('.toggle-btn');

  // ---------- Toast ----------
  function toast(message, type = 'info') {
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = message;
    toastWrap.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transition = 'opacity .3s';
      setTimeout(() => el.remove(), 300);
    }, 2800);
  }
  function showError(message) {
    console.error(message);
    toast(message, 'error');
  }

  // ---------- Helpers ----------
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text ?? '';
    return div.innerHTML;
  }
  function getInitial(name) {
    if (!name) return '•';
    return name.trim().split(/\s+/).map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '•';
  }
  function filteredTasks() {
    if (!searchQuery) return tasks;
    const q = searchQuery.toLowerCase();
    return tasks.filter((t) =>
      (t.title || '').toLowerCase().includes(q) ||
      (t.description || '').toLowerCase().includes(q)
    );
  }

  function getTaskProgressValue(status) {
    if (status === 'done') return 100;
    if (status === 'in_progress') return 50;
    return 0;
  }

  function formatDate(value) {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  // ---------- Fetch ----------
  async function fetchTasks() {
    try {
      const res = await fetch(`${API_BASE}/api/tasks`);
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Fetch tasks failed:', res.status, errorText || res.statusText);
        throw new Error('Backend not reachable. Is the server running on :5000?');
      }
      tasks = await res.json();
      renderAll();
    } catch (err) {
      console.error('fetchTasks error:', err);
      showError(err.message);
      renderAll();
    }
  }

  function renderAll() {
    renderBoard();
    renderTable();
    updateProgress();
  }

  // ---------- Board ----------
  function renderBoard() {
    const list = filteredTasks();
    STATUSES.forEach((status) => {
      const col = columns[status];
      col.innerHTML = '';
      const items = list.filter((t) => t.status === status);
      if (taskCounts[status]) taskCounts[status].textContent = items.length;
      if (items.length === 0) {
        col.innerHTML = '<div class="empty-column">No tasks — click + to add</div>';
        return;
      }
      items.forEach((task) => col.appendChild(createTaskElement(task)));
    });
  }

  function createTaskElement(task) {
    const status = task.status;
    const cssStatus = status.replace('_', '-');
    const createdBy = task.created_by && task.created_by.trim() ? task.created_by.trim() : 'unknown';
    const initials = createdBy === 'unknown' ? '•' : createdBy.split(' ').map(n => n[0] ? n[0] : '').join('').toUpperCase().slice(0, 2) || '•';
    const card = document.createElement('div');
    card.className = `task-card ${cssStatus}`;
    card.draggable = true;
    card.dataset.id = task._id;
    const dateLabel = task.createdAt ? new Date(task.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toLowerCase() : 'now';
    const progressPercent = getTaskProgressValue(status);
    card.innerHTML = `
      <div class="task-top">
        <h3>${escapeHtml(task.title)}</h3>
        <span class="status-pill ${status}">${STATUS_LABEL[status] || status}</span>
      </div>
      <p>${escapeHtml(task.description || '')}</p>
      <div class="task-progress-row">
        <span>progress</span>
        <span>${progressPercent}%</span>
      </div>
      <div class="mini-progress"><span style="width: ${progressPercent}%"></span></div>
      <div class="task-actions">
        <button class="icon-btn" data-act="prev" ${status === 'todo' ? 'disabled' : ''} title="Move back">‹</button>
        <button class="icon-btn" data-act="next" ${status === 'done' ? 'disabled' : ''} title="Move forward">›</button>
        <button class="icon-btn" data-act="edit" title="Edit">✎</button>
        <button class="icon-btn danger" data-act="del" title="Delete">🗑</button>
      </div>
      <div class="creator-row">
        <span class="creator-avatar">${initials}</span>
        <span class="creator-name">${escapeHtml(createdBy)}</span>
        <span class="created-date">${escapeHtml(dateLabel)}</span>
      </div>
    `;

    card.querySelector('[data-act="prev"]').addEventListener('click', () => moveTask(task._id, 'prev'));
    card.querySelector('[data-act="next"]').addEventListener('click', () => moveTask(task._id, 'next'));
    card.querySelector('[data-act="edit"]').addEventListener('click', () => openEditModal(task));
    card.querySelector('[data-act="del"]').addEventListener('click', () => deleteTask(task._id));

    card.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', task._id);
      card.classList.add('dragging');
    });
    card.addEventListener('dragend', () => card.classList.remove('dragging'));
    return card;
  }

  // Drag-drop columns
  document.querySelectorAll('.column-tasks').forEach((col) => {
    col.addEventListener('dragover', (e) => { e.preventDefault(); col.classList.add('drag-over'); });
    col.addEventListener('dragleave', () => col.classList.remove('drag-over'));
    col.addEventListener('drop', (e) => {
      e.preventDefault();
      col.classList.remove('drag-over');
      const id = e.dataTransfer.getData('text/plain');
      const newStatus = col.id === 'todo-column' ? 'todo' : col.id === 'in-progress-column' ? 'in_progress' : 'done';
      updateStatus(id, newStatus);
    });
  });

  async function moveTask(taskId, direction) {
    const task = tasks.find((t) => t._id === taskId);
    if (!task) return;
    const idx = STATUSES.indexOf(task.status);
    let next = null;
    if (direction === 'prev' && idx > 0) next = STATUSES[idx - 1];
    if (direction === 'next' && idx < STATUSES.length - 1) next = STATUSES[idx + 1];
    if (!next) return;
    updateStatus(taskId, next);
  }

  async function updateStatus(taskId, newStatus) {
    const task = tasks.find((t) => t._id === taskId);
    if (task && task.status === newStatus) return;
    try {
      const res = await fetch(`${API_BASE}/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Update status failed:', res.status, errorText || res.statusText);
        throw new Error('Failed to move task');
      }
      toast(`Moved to ${STATUS_LABEL[newStatus]}`, 'success');
      fetchTasks();
    } catch (err) {
      console.error('updateStatus error:', err);
      showError('Failed to move task');
    }
  }

  async function deleteTask(taskId) {
    if (!confirm('Delete this task? This cannot be undone.')) return;
    try {
      const res = await fetch(`${API_BASE}/api/tasks/${taskId}`, { method: 'DELETE' });
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Delete task failed:', res.status, errorText || res.statusText);
        throw new Error('Delete failed');
      }
      toast('Task deleted', 'success');
      fetchTasks();
    } catch (err) {
      console.error('deleteTask error:', err);
      showError('Failed to delete task');
    }
  }

  // ---------- Table ----------
  function renderTable() {
    const list = filteredTasks();
    tableBody.innerHTML = '';
    emptyTable.hidden = list.length !== 0;
    list.forEach((task) => {
      const tr = document.createElement('tr');
      const assignedTo = task.created_by && task.created_by.trim() ? task.created_by.trim() : 'Unassigned';
      const dueDate = task.due_date || task.dueDate || task.due;
      tr.innerHTML = `
        <td><div class="table-title">${escapeHtml(task.title)}</div></td>
        <td><span class="status-pill ${task.status}">${STATUS_LABEL[task.status] || task.status}</span></td>
        <td><span class="table-progress">${getTaskProgressValue(task.status)}%</span></td>
        <td>${escapeHtml(assignedTo)}</td>
        <td>${escapeHtml(formatDate(dueDate))}</td>
        <td class="table-actions">
          <button class="icon-btn" data-a="prev">←</button>
          <button class="icon-btn" data-a="next">→</button>
          <button class="icon-btn" data-a="edit">Edit</button>
          <button class="icon-btn danger" data-a="del">Delete</button>
        </td>
      `;
      tr.querySelector('[data-a="prev"]').addEventListener('click', () => moveTask(task._id, 'prev'));
      tr.querySelector('[data-a="next"]').addEventListener('click', () => moveTask(task._id, 'next'));
      tr.querySelector('[data-a="edit"]').addEventListener('click', () => openEditModal(task));
      tr.querySelector('[data-a="del"]').addEventListener('click', () => deleteTask(task._id));
      tableBody.appendChild(tr);
    });
  }

  // ---------- Progress ----------
  function updateProgress() {
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === 'done').length;
    const weightedProgress = tasks.reduce((sum, task) => sum + getTaskProgressValue(task.status), 0);
    const pct = total > 0 ? Math.round((weightedProgress / (total * 100)) * 100) : 0;
    const fill = document.querySelector('.progress-bar .progress-fill');
    if (fill) {
      fill.style.width = `${pct}%`;
      fill.querySelector('span').textContent = `${pct}%`;
    }
    progressBar.setAttribute('aria-valuenow', String(pct));
    progressPercentage.textContent = `${done} / ${total} tasks`;
  }

  // ---------- Modal ----------
  function openCreateModal() {
    editingId = null;
    taskForm.reset();
    document.getElementById('task-id').value = '';
    modalTitle.textContent = 'Create New Task';
    modalSubmit.textContent = 'Create Task';
    openModal();
  }
  function openEditModal(task) {
    editingId = task._id;
    document.getElementById('task-id').value = task._id;
    document.getElementById('task-title').value = task.title || '';
    document.getElementById('task-description').value = task.description || '';
    document.getElementById('task-created-by').value = task.created_by || '';
    modalTitle.textContent = 'Edit Task';
    modalSubmit.textContent = 'Save Changes';
    openModal();
  }
  function openModal() {
    taskModal.classList.add('open');
    taskModal.setAttribute('aria-hidden', 'false');
    setTimeout(() => document.getElementById('task-title').focus(), 50);
  }
  function closeModal() {
    taskModal.classList.remove('open');
    taskModal.setAttribute('aria-hidden', 'true');
    taskForm.reset();
    editingId = null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const title = document.getElementById('task-title').value.trim();
    const description = document.getElementById('task-description').value.trim();
    const created_by = document.getElementById('task-created-by').value.trim();

    if (!title || !description) {
      showError('Title and description are required');
      return;
    }

    modalSubmit.disabled = true;
    try {
      if (editingId) {
        const res = await fetch(`${API_BASE}/api/tasks/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, description, created_by }),
        });
        if (!res.ok) {
          const errorText = await res.text();
          console.error('Edit task failed:', res.status, errorText || res.statusText);
          throw new Error('Failed to update task');
        }
        toast('Task updated', 'success');
      } else {
        const res = await fetch(`${API_BASE}/api/tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, description, created_by, status: 'todo' }),
        });
        if (!res.ok) {
          const errorText = await res.text();
          console.error('Create task failed:', res.status, errorText || res.statusText);
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || 'Failed to create task');
        }
        toast('Task created', 'success');
      }
      closeModal();
      fetchTasks();
    } catch (err) {
      showError(err.message);
    } finally {
      modalSubmit.disabled = false;
    }
  }

  // ---------- Events ----------
  ctaButton.addEventListener('click', () => openCreateModal());
  modalClose.addEventListener('click', closeModal);
  modalCancel.addEventListener('click', closeModal);
  taskForm.addEventListener('submit', handleSubmit);
  window.addEventListener('click', (e) => { if (e.target === taskModal) closeModal(); });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

  toggleBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      setView(btn.dataset.view);
    });
  });

  function setView(view) {
    currentView = view === 'table' ? 'table' : 'board';
    const isBoard = currentView === 'board';
    toggleBtns.forEach((btn) => {
      const isActive = btn.dataset.view === currentView;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', String(isActive));
    });
    boardView.hidden = !isBoard;
    tableView.hidden = isBoard;
    boardView.setAttribute('aria-hidden', String(!isBoard));
    tableView.setAttribute('aria-hidden', String(isBoard));
    if (isBoard) renderBoard();
    else renderTable();
  }

  searchInput.addEventListener('input', () => {
    searchQuery = searchInput.value.trim();
    renderBoard();
    renderTable();
  });

  fetchTasks();
});