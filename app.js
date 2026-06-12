const taskFormPanel = document.getElementById('taskFormPanel');
const newTaskBtn = document.getElementById('newTaskBtn');
const closeFormBtn = document.getElementById('closeFormBtn');
const clearFormBtn = document.getElementById('clearFormBtn');
const taskForm = document.getElementById('taskForm');
const taskList = document.getElementById('taskList');
const taskCount = document.getElementById('taskCount');
const categoryFilter = document.getElementById('categoryFilter');
const priorityFilter = document.getElementById('priorityFilter');
const statusFilter = document.getElementById('statusFilter');
const searchInput = document.getElementById('searchInput');
const reminderBanner = document.getElementById('reminderBanner');
const monthLabel = document.getElementById('monthLabel');
const calendarGrid = document.getElementById('calendarGrid');
const prevMonth = document.getElementById('prevMonth');
const nextMonth = document.getElementById('nextMonth');

const formFields = {
  title: document.getElementById('taskTitle'),
  description: document.getElementById('taskDescription'),
  dueDate: document.getElementById('taskDueDate'),
  dueTime: document.getElementById('taskDueTime'),
  category: document.getElementById('taskCategory'),
  tags: document.getElementById('taskTags'),
  priority: document.getElementById('taskPriority'),
};

let tasks = [];
let activeTaskId = null;
let calendarDate = new Date();

function loadTasks() {
  const saved = localStorage.getItem('taskTrackerTasks');
  tasks = saved ? JSON.parse(saved) : [];
}

function saveTasks() {
  localStorage.setItem('taskTrackerTasks', JSON.stringify(tasks));
}

function openForm(task = null) {
  taskFormPanel.classList.remove('hidden');
  if (task) {
    activeTaskId = task.id;
    formFields.title.value = task.title;
    formFields.description.value = task.description;
    formFields.dueDate.value = task.dueDate;
    formFields.dueTime.value = task.dueTime || '';
    formFields.category.value = task.category;
    formFields.tags.value = task.tags.join(', ');
    formFields.priority.value = task.priority;
  } else {
    activeTaskId = null;
    taskForm.reset();
    formFields.priority.value = 'medium';
    formFields.dueDate.value = new Date().toISOString().slice(0, 10);
  }
}

function closeForm() {
  taskFormPanel.classList.add('hidden');
  activeTaskId = null;
  taskForm.reset();
}

function getTaskFilters() {
  return {
    search: searchInput.value.trim().toLowerCase(),
    category: categoryFilter.value,
    priority: priorityFilter.value,
    status: statusFilter.value,
  };
}

function filterTasks() {
  const { search, category, priority, status } = getTaskFilters();
  return tasks.filter(task => {
    const matchesText = [task.title, task.description, task.category, task.tags.join(' ')].some(field =>
      field.toLowerCase().includes(search),
    );
    const matchesCategory = category === 'all' || task.category === category;
    const matchesPriority = priority === 'all' || task.priority === priority;
    const matchesStatus = status === 'all' || task.status === status;
    return matchesText && matchesCategory && matchesPriority && matchesStatus;
  });
}

function renderTaskList() {
  const visibleTasks = filterTasks();
  taskList.innerHTML = '';
  taskCount.textContent = `${visibleTasks.length} task${visibleTasks.length === 1 ? '' : 's'}`;

  if (!visibleTasks.length) {
    taskList.innerHTML = '<p class="empty-state">No tasks match these filters. Add a new task to get started.</p>';
    return;
  }

  visibleTasks.sort((a, b) => new Date(a.dueDate + 'T' + (a.dueTime || '23:59')) - new Date(b.dueDate + 'T' + (b.dueTime || '23:59')));

  visibleTasks.forEach(task => {
    const card = document.createElement('article');
    card.className = `task-card ${task.status === 'completed' ? 'completed' : ''}`;

    const dueLabel = task.dueTime ? `${task.dueDate} ${task.dueTime}` : task.dueDate;
    card.innerHTML = `
      <div class="task-card-inner">
        <h3>${task.title}</h3>
        <div class="task-meta">
          <span class="category-pill">${task.category || 'General'}</span>
          <span class="priority-pill ${task.priority}">${task.priority}</span>
          <span>Due ${dueLabel}</span>
        </div>
        <p>${task.description || 'No description provided.'}</p>
        <div class="task-meta">${task.tags.map(tag => `<span class="tag">#${tag}</span>`).join('')}</div>
        <div class="task-actions">
          <button data-action="toggle" data-id="${task.id}">${task.status === 'completed' ? 'Mark Pending' : 'Complete'}</button>
          <button data-action="edit" data-id="${task.id}">Edit</button>
          <button data-action="delete" data-id="${task.id}">Delete</button>
        </div>
      </div>
    `;

    taskList.appendChild(card);
  });
}

function updateCategoryFilter() {
  const categories = Array.from(new Set(tasks.map(task => task.category).filter(Boolean))).sort();
  categoryFilter.innerHTML = '<option value="all">All</option>' + categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
}

function getReminderText() {
  const now = new Date();
  const upcoming = tasks.filter(task => task.status === 'pending').filter(task => {
    const due = new Date(`${task.dueDate}T${task.dueTime || '23:59'}:00`);
    return due >= now && due <= new Date(now.getTime() + 60 * 60 * 1000);
  });

  if (!upcoming.length) return '';
  upcoming.sort((a, b) => new Date(`${a.dueDate}T${a.dueTime || '23:59'}:00`) - new Date(`${b.dueDate}T${b.dueTime || '23:59'}:00`));
  const next = upcoming[0];
  return `Reminder: "${next.title}" is due soon (${next.dueDate}${next.dueTime ? ' ' + next.dueTime : ''}).`;
}

function renderReminderBanner() {
  const text = getReminderText();
  if (text) {
    reminderBanner.textContent = text;
    reminderBanner.classList.remove('hidden');
    requestNotificationPermission();
  } else {
    reminderBanner.classList.add('hidden');
  }
}

function requestNotificationPermission() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function renderCalendar() {
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startWeekday = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  monthLabel.textContent = firstDay.toLocaleString('default', { month: 'long', year: 'numeric' });
  calendarGrid.innerHTML = '';

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  weekDays.forEach(label => {
    const header = document.createElement('div');
    header.className = 'day-cell';
    header.innerHTML = `<strong>${label}</strong>`;
    calendarGrid.appendChild(header);
  });

  for (let i = 0; i < startWeekday; i++) {
    calendarGrid.appendChild(document.createElement('div'));
  }

  const tasksByDate = tasks.reduce((groups, task) => {
    groups[task.dueDate] = groups[task.dueDate] || [];
    groups[task.dueDate].push(task);
    return groups;
  }, {});

  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const cell = document.createElement('div');
    cell.className = 'day-cell';
    if (dateKey === new Date().toISOString().slice(0, 10)) {
      cell.classList.add('today');
    }
    cell.innerHTML = `<div class="day-number">${day}</div>`;

    const dayTasks = tasksByDate[dateKey] || [];
    if (dayTasks.length) {
      const priorities = ['urgent', 'high', 'medium', 'low'];
      priorities.forEach(priority => {
        const count = dayTasks.filter(task => task.priority === priority).length;
        if (count) {
          const badge = document.createElement('div');
          badge.className = `calendar-badge badge-${priority}`;
          badge.textContent = `${priority}: ${count}`;
          cell.appendChild(badge);
        }
      });
    }

    calendarGrid.appendChild(cell);
  }
}

function submitTaskForm(event) {
  event.preventDefault();
  const title = formFields.title.value.trim();
  const description = formFields.description.value.trim();
  const dueDate = formFields.dueDate.value;
  const dueTime = formFields.dueTime.value;
  const category = formFields.category.value.trim();
  const tags = formFields.tags.value.split(',').map(tag => tag.trim()).filter(Boolean);
  const priority = formFields.priority.value;

  if (!title || !dueDate) return;

  const task = {
    id: activeTaskId || crypto.randomUUID(),
    title,
    description,
    dueDate,
    dueTime,
    category,
    tags,
    priority,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  if (activeTaskId) {
    tasks = tasks.map(existing => (existing.id === activeTaskId ? { ...existing, ...task, id: activeTaskId } : existing));
  } else {
    tasks.push(task);
  }

  saveTasks();
  refreshUI();
  closeForm();
}

function handleTaskAction(event) {
  const button = event.target.closest('button');
  if (!button || !button.dataset.action) return;
  const action = button.dataset.action;
  const id = button.dataset.id;
  const task = tasks.find(item => item.id === id);
  if (!task) return;

  if (action === 'toggle') {
    task.status = task.status === 'completed' ? 'pending' : 'completed';
  }
  if (action === 'edit') {
    openForm(task);
    return;
  }
  if (action === 'delete') {
    tasks = tasks.filter(item => item.id !== id);
  }
  saveTasks();
  refreshUI();
}

function refreshUI() {
  updateCategoryFilter();
  renderTaskList();
  renderReminderBanner();
  renderCalendar();
}

function init() {
  loadTasks();
  if (!tasks.length) {
    const today = new Date().toISOString().slice(0, 10);
    formFields.dueDate.value = today;
  }
  refreshUI();
  openForm();
  closeForm();
}

newTaskBtn.addEventListener('click', () => openForm());
closeFormBtn.addEventListener('click', closeForm);
clearFormBtn.addEventListener('click', () => {
  taskForm.reset();
  formFields.priority.value = 'medium';
});
taskForm.addEventListener('submit', submitTaskForm);
taskList.addEventListener('click', handleTaskAction);
[searchInput, categoryFilter, priorityFilter, statusFilter].forEach(input => input.addEventListener('input', renderTaskList));
prevMonth.addEventListener('click', () => {
  calendarDate.setMonth(calendarDate.getMonth() - 1);
  renderCalendar();
});
nextMonth.addEventListener('click', () => {
  calendarDate.setMonth(calendarDate.getMonth() + 1);
  renderCalendar();
});

setInterval(() => {
  renderReminderBanner();
}, 60 * 1000);

init();
