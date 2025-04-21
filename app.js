// — DOM Elements —
const form         = document.getElementById('todo-form');
const todoInput    = document.getElementById('todo-input');
const prioritySel  = document.getElementById('priority-select');
const dueDateInput = document.getElementById('due-date-input');
const dueTimeInput = document.getElementById('due-time-input');
const searchInput  = document.getElementById('search-input');
const filterSelect = document.getElementById('filter-select');
const sortSelect   = document.getElementById('sort-select');
const todoList     = document.getElementById('todo-list');
const emptyState   = document.getElementById('empty-state');
const progressBar  = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');
const themeBtn     = document.getElementById('theme-btn');

let allTodos = loadTodos();
let filteredTodos = [];

// — Init —
applyFilters();
themeBtn.addEventListener('click', toggleTheme);

// — Event Listeners —
form.addEventListener('submit', e => {
  e.preventDefault();
  addTodo();
});
searchInput.addEventListener('input',  applyFilters);
filterSelect.addEventListener('change', applyFilters);
sortSelect.addEventListener('change',  applyFilters);

// — Theme Toggle —
function toggleTheme() {
  document.body.classList.toggle('light-mode');
  themeBtn.textContent = document.body.classList.contains('light-mode') ? '☀️' : '🌙';
}

// — Add Todo —
/*function addTodo() {
  const text = todoInput.value.trim();
  if (!text) return;
  allTodos.push({
    text,
    completed: false,
    priority: prioritySel.value,
    dueDate: dueDateInput.value || null
  });
  saveTodos();
  form.reset();
  applyFilters();
}*/

function addTodo() {
  const text    = todoInput.value.trim();
  const dueTime = dueTimeInput.value;

  if (!text) return;

  const todo = {
    text,
    completed: false,
    priority: prioritySel.value,
    dueDate:  dueDateInput.value  || null,
    dueTime:  dueTime             || null
  };

  allTodos.push(todo);
  saveTodos();
  form.reset();
  applyFilters();

  // — Schedule alert —
  if (todo.dueDate && todo.dueTime) {
    const dt   = new Date(`${todo.dueDate}T${todo.dueTime}`);
    const diff = dt - new Date();
    if (diff > 0) {
      setTimeout(() => {
        alert(`Reminder: It's time for your task: "${todo.text}"`);
      }, diff);
    }
  }
}

// — Filters / Sort / Search —
function applyFilters() {
  const term = searchInput.value.toLowerCase();
  const stat = filterSelect.value;
  const sortBy = sortSelect.value;

  filteredTodos = allTodos
    .filter(t => t.text.toLowerCase().includes(term))
    .filter(t =>
      stat === 'all' ||
      (stat === 'completed' && t.completed) ||
      (stat === 'pending'   && !t.completed)
    );

  // Priority sort: High→Medium→Low→undefined
  if (sortBy === 'priority') {
    const order = { high: 0, medium: 1, low: 2, undefined: 3 };
    filteredTodos.sort((a, b) => {
      const pa = order[a.priority]   ?? order.undefined;
      const pb = order[b.priority]   ?? order.undefined;
      return pa - pb;
    });
  }

  // Due-date sort (earliest first)
  if (sortBy === 'dueDate') {
    filteredTodos.sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    });
  }

  renderList();
  updateProgress();
}

// — Render List —
function renderList() {
  todoList.innerHTML = '';
  if (filteredTodos.length === 0) {
    emptyState.style.display = 'block';
    return;
  }
  emptyState.style.display = 'none';

  filteredTodos.forEach(todo => {
    const idx = allTodos.indexOf(todo);
    todoList.append(createTodoItem(todo, idx));
  });
}

// — Create Single Item —
function createTodoItem(todo, idx) {
  const li = document.createElement('li');
  li.className = `todo priority-${todo.priority ?? 'undefined'}`;
  li.innerHTML = `
    <input type="checkbox" id="t${idx}" ${todo.completed ? 'checked' : ''}/>
    <label class="custom-checkbox" for="t${idx}">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" width="20" height="20">
        <path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/>
      </svg>
    </label>
    <div class="todo-content">
      <span class="todo-text">${todo.text}</span>
      <small class="priority-label priority-${todo.priority ?? 'undefined'}">
        Priority: ${capitalize(todo.priority)}
      </small>
      <!--${todo.dueDate ? `<small>Due: ${todo.dueDate}</small>` : ''} -->
      ${todo.dueDate
        ? `<small>Due: ${todo.dueDate}${todo.dueTime ? ` at ${todo.dueTime}` : ''}</small>`
        : ''}
    </div>
    <button class="edit-button"  title="Edit">
      <svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41
      l-2.34-2.34a.9959.9959 0 00-1.41 0l-1.83 1.83 3.75 3.75
      1.83-1.83z"/></svg>
    </button>
    <button class="delete-button" title="Delete">
      <svg viewBox="0 0 24 24"><path d="M6 19a2 2 0 002 2h8a2 2 0
      002-2V7H6v12zm3.46-9.12l1.42-1.42L12
      10.59l1.12-1.13 1.42 1.42L13.41 12l1.13
      1.12-1.42 1.42L12 13.41l-1.12 1.13-1.42-1.42L10.59 12
      9.46 10.88zM15 4l-1-1h-4l-1 1H5v2h14V4h-4z"/></svg>
    </button>
  `;

  // Toggle complete
  li.querySelector('input').addEventListener('change', e => {
    allTodos[idx].completed = e.target.checked;
    saveTodos();
    applyFilters();
  });

  // Delete
  li.querySelector('.delete-button').addEventListener('click', () => {
    allTodos.splice(idx, 1);
    saveTodos();
    applyFilters();
  });

  // Inline Edit
  li.querySelector('.edit-button').addEventListener('click', () => {
    startInlineEdit(li, idx, todo);
  });

  return li;
}

// — Inline Edit Mode —
function startInlineEdit(li, idx, todo) {
  const content = li.querySelector('.todo-content');
  content.classList.add('editing');
  content.innerHTML = `
    <input type="text" class="edit-text" value="${todo.text}" />
    <select class="edit-priority">
      <option value="low"${todo.priority==='low'?' selected':''}>Low</option>
      <option value="medium"${todo.priority==='medium'?' selected':''}>Medium</option>
      <option value="high"${todo.priority==='high'?' selected':''}>High</option>
    </select>
    <input type="date" class="edit-due" value="${todo.dueDate||''}" />
    <button class="save-btn">Save</button>
    <button class="cancel-btn">Cancel</button>
  `;
  li.querySelector('.edit-button').style.display = 'none';
  li.querySelector('.delete-button').style.display = 'none';

  content.querySelector('.save-btn').addEventListener('click', () => {
    const nt = content.querySelector('.edit-text').value.trim();
    const np = content.querySelector('.edit-priority').value;
    const nd = content.querySelector('.edit-due').value || null;
    if (nt) allTodos[idx].text = nt;
    allTodos[idx].priority = np;
    allTodos[idx].dueDate  = nd;
    saveTodos();
    applyFilters();
  });

  content.querySelector('.cancel-btn').addEventListener('click', () => {
    applyFilters();
  });
}

// — Utilities —

// Capitalize first letter or show “Undefined”
function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Undefined';
}

// Progress Bar
function updateProgress() {
  const total = allTodos.length;
  const done  = allTodos.filter(t => t.completed).length;
  const pct   = total ? (done/total)*100 : 0;
  progressBar.style.width    = pct + '%';
  progressText.textContent   = `${done}/${total}`;
}

// Persistence
function saveTodos() {
  localStorage.setItem('todos', JSON.stringify(allTodos));
}
function loadTodos() {
  return JSON.parse(localStorage.getItem('todos') || '[]');
}
