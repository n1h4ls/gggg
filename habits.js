const STORAGE_KEY = 'habitTracker.v1';
const habitsListEl = document.getElementById('habits');
const habitNameInput = document.getElementById('habitName');
const addBtn = document.getElementById('addHabitBtn');

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch (e) { return []; }
}

function save(habits) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
}

function render() {
  const habits = load();
  habitsListEl.innerHTML = '';
  if (!habits.length) {
    habitsListEl.innerHTML = '<div class="empty">No habits yet — add one above.</div>';
    return;
  }
  const key = todayKey();
  habits.forEach(h => {
    const li = document.createElement('li');
    li.className = 'habit-item';
    const doneToday = (h.records || []).includes(key);
    const streak = currentStreak(h);
    const weekly = weeklyCount(h);
    li.innerHTML = `
      <div class="habit-meta">
        <div class="checkbox ${doneToday ? 'done' : ''}" data-id="${h.id}" aria-label="toggle done">${doneToday ? '✓' : ''}</div>
        <div>
          <div class="habit-name">${escapeHtml(h.name)}</div>
          <div class="habit-sub muted">${h.records ? h.records.length : 0} total completions</div>
        </div>
      </div>
      <div class="habit-stats">
        <div>Streak: <span class="badge">${streak}d</span>  This week: <span class="badge">${weekly}</span></div>
      </div>
      <div class="actions">
        <button data-action="rename" data-id="${h.id}">Rename</button>
        <button data-action="remove" data-id="${h.id}">Remove</button>
      </div>
    `;
    habitsListEl.appendChild(li);
  });

  renderWeeklySummary(habits);
}

function currentStreak(habit){
  const records = new Set((habit.records||[]));
  let count = 0;
  for(let i=0;;i++){
    const d = new Date(); d.setDate(d.getDate()-i);
    const key = d.toISOString().slice(0,10);
    if(records.has(key)) count++; else break;
  }
  return count;
}

function weeklyCount(habit){
  const records = habit.records || [];
  const today = new Date();
  const weekAgo = new Date(); weekAgo.setDate(today.getDate()-6);
  const minKey = weekAgo.toISOString().slice(0,10);
  return records.filter(r => r >= minKey).length;
}

function renderWeeklySummary(habits){
  const container = document.getElementById('weeklySummary');
  container.innerHTML = '';
  if(!habits.length){ container.innerHTML = '<div class="empty">No habits yet.</div>'; return; }
  const rows = habits.map(h => ({ name: h.name, weekly: weeklyCount(h), streak: currentStreak(h) }));
  rows.sort((a,b)=>b.weekly - a.weekly || b.streak - a.streak);
  rows.forEach(r=>{
    const div = document.createElement('div');
    div.className = 'summary-item';
    div.innerHTML = `<div>${escapeHtml(r.name)}</div><div>${r.weekly} this week • ${r.streak}d streak</div>`;
    container.appendChild(div);
  });
}

function escapeHtml(str){ return String(str).replace(/[&<>"']/g, s=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[s])); }

function addHabit(name){
  const habits = load();
  const id = crypto.randomUUID();
  habits.push({ id, name: name.trim(), records: [] });
  save(habits);
  render();
}

function toggleDone(id){
  const habits = load();
  const key = todayKey();
  const h = habits.find(x => x.id === id);
  if (!h) return;
  h.records = h.records || [];
  const idx = h.records.indexOf(key);
  if (idx >= 0) h.records.splice(idx, 1); else h.records.push(key);
  save(habits);
  render();
}

function removeHabit(id){
  let habits = load();
  habits = habits.filter(h => h.id !== id);
  save(habits);
  render();
}

addBtn.addEventListener('click', () => {
  const name = habitNameInput.value.trim();
  if (!name) return;
  addHabit(name);
  habitNameInput.value = '';
  habitNameInput.focus();
});

habitsListEl.addEventListener('click', (e) => {
  const checkbox = e.target.closest('.checkbox');
  if (checkbox) {
    toggleDone(checkbox.dataset.id);
    return;
  }
  const btn = e.target.closest('button');
  if (btn && btn.dataset.action === 'remove') {
    removeHabit(btn.dataset.id);
    return;
  }
  if (btn && btn.dataset.action === 'rename') {
    const id = btn.dataset.id;
    const habits = load();
    const h = habits.find(x=>x.id===id);
    if(!h) return;
    const newName = prompt('Rename habit', h.name);
    if(newName && newName.trim()){ h.name = newName.trim(); save(habits); render(); }
  }
});

// render on load
render();
