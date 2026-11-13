const $ = (selector) => document.querySelector(selector);
const toast = $('#toast');
let toastTimer;

function showToast(message) {
  toast.querySelector('span').textContent = message;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 2600);
}

function setNumber(selector, value, caption) {
  const target = $(selector);
  target.replaceChildren(document.createTextNode(String(value)));
  const note = document.createElement('span');
  note.className = 'stat-caption';
  note.textContent = caption;
  target.append(note);
}

function timeLabel(dateValue) {
  return new Intl.DateTimeFormat('es-EC', {
    timeZone: 'America/Guayaquil',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateValue));
}

function agentLabel(agent) {
  if (!agent) return 'Sin asignar';
  return agent.toLowerCase() === 'codex' ? 'Codex' : agent;
}

function taskBucket(status) {
  if (['complete', 'closed'].includes(status)) return 'complete';
  if (['active', 'in_progress', 'assigned', 'review_ready'].includes(status)) return 'active';
  return 'todo';
}

function taskStatusLabel(status) {
  const labels = {
    active: 'EN PROGRESO',
    in_progress: 'EN PROGRESO',
    assigned: 'ASIGNADA',
    review_ready: 'PARA REVISIÓN',
    complete: 'COMPLETADA',
    closed: 'CERRADA',
  };
  return labels[status] || 'POR HACER';
}

function makeTaskCard(task) {
  const card = document.createElement('article');
  card.className = 'task-card';
  const top = document.createElement('div');
  top.className = 'task-top';
  const tag = document.createElement('span');
  tag.className = `task-tag ${taskBucket(task.status) === 'complete' ? 'green-tag' : taskBucket(task.status) === 'active' ? 'blue-tag' : 'violet-tag'}`;
  tag.textContent = taskStatusLabel(task.status);
  const id = document.createElement('span');
  id.className = 'task-id';
  id.textContent = task.task_id;
  top.append(tag, id);

  const title = document.createElement('h3');
  title.textContent = task.title;
  const modules = document.createElement('p');
  modules.textContent = task.modules?.length ? task.modules.join(' · ') : 'Sin módulos asignados';

  const owner = document.createElement('div');
  owner.className = 'owner-row';
  const avatar = document.createElement('span');
  avatar.className = `mini-avatar ${task.agent === 'codex' ? 'codex-mini' : 'claude-mini'}`;
  avatar.textContent = task.agent === 'codex' ? '⌘' : '◎';
  const agent = document.createElement('span');
  agent.textContent = agentLabel(task.agent);
  const status = document.createElement('span');
  status.className = taskBucket(task.status) === 'complete' ? 'review-ready' : 'owner-status';
  status.textContent = taskStatusLabel(task.status);
  owner.append(avatar, agent, status);

  const updated = document.createElement('div');
  updated.className = 'task-meta';
  updated.textContent = `Actualizada ${timeLabel(task.updated_at)}`;
  card.append(top, title, modules, owner, updated);
  return card;
}

function makeActivity(event, task) {
  const row = document.createElement('div');
  row.className = 'activity-item';
  const avatar = document.createElement('div');
  avatar.className = `activity-avatar ${task?.agent === 'codex' ? 'codex-mini' : 'claude-mini'}`;
  avatar.textContent = task?.agent === 'codex' ? '⌘' : '◎';
  const copy = document.createElement('div');
  const title = document.createElement('p');
  const agent = document.createElement('strong');
  agent.textContent = agentLabel(task?.agent) || 'Agente';
  const action = document.createTextNode(` ${event.tool.replaceAll('_', ' ')}`);
  title.append(agent, action);
  const detail = document.createElement('small');
  detail.textContent = `${task?.title || event.task_id} · ${event.status || 'registrado'}`;
  copy.append(title, detail);
  const time = document.createElement('span');
  time.className = 'activity-time';
  time.textContent = timeLabel(event.created_at);
  row.append(avatar, copy, time);
  return row;
}

function renderState(data) {
  const tasks = data.state.tasks || [];
  const presence = (data.state.presence || []).filter((agent) => agent.liveness === 'live');
  const active = tasks.filter((task) => taskBucket(task.status) === 'active');
  const completed = tasks.filter((task) => ['complete', 'closed'].includes(task.status));

  $('#navAgentCount').textContent = String(presence.length);
  $('#navTaskCount').textContent = String(tasks.length);
  setNumber('#activeAgents', presence.length, ' agentes online');
  setNumber('#activeTasks', active.length, ' tareas');
  setNumber('#completedTasks', completed.length, ' tareas');
  setNumber('#eventCount', data.events.length, ' eventos');
  $('#workspaceId').textContent = data.repository;
  $('#lastSync').textContent = timeLabel(data.state.generated_at);
  $('#currentTask').textContent = active[0]?.title || 'Sin tareas en curso';
  $('#mcpConnection').classList.add('online');
  $('#mcpConnectionText').textContent = 'ESTADO LOCAL OK';
  $('#topStatus').innerHTML = '<span class="pulse-dot"></span> WORKSPACE SINCRONIZADO';

  const columns = {
    todo: { list: $('#todoTasks'), empty: $('[data-column="todo"] .board-empty'), count: $('#countTodo') },
    active: { list: $('#activeTaskList'), empty: $('[data-column="active"] .board-empty'), count: $('#countActive') },
    complete: { list: $('#completeTasks'), empty: $('[data-column="complete"] .board-empty'), count: $('#countComplete') },
  };
  const groupedTasks = { todo: [], active: [], complete: [] };
  [...tasks]
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    .forEach((task) => groupedTasks[taskBucket(task.status)].push(task));
  Object.entries(columns).forEach(([bucket, column]) => {
    column.count.textContent = String(groupedTasks[bucket].length).padStart(2, '0');
    column.list.replaceChildren(...groupedTasks[bucket].map(makeTaskCard));
    column.empty.hidden = groupedTasks[bucket].length > 0;
  });

  const taskById = new Map(tasks.map((task) => [task.task_id, task]));
  const eventList = $('#activityList');
  eventList.replaceChildren();
  const recentEvents = [...data.events].slice(-6).reverse();
  if (!recentEvents.length) {
    const empty = document.createElement('p');
    empty.className = 'live-placeholder';
    empty.textContent = 'Aún no hay eventos registrados.';
    eventList.append(empty);
  } else {
    recentEvents.forEach((event) => eventList.append(makeActivity(event, taskById.get(event.task_id))));
  }

  const agentList = $('#agentList');
  agentList.replaceChildren();
  if (!presence.length) {
    const empty = document.createElement('p');
    empty.className = 'live-placeholder';
    empty.textContent = 'No hay agentes activos en este momento.';
    agentList.append(empty);
  } else {
    presence.forEach((agent) => {
      const row = document.createElement('div');
      row.className = 'agent-row';
      const avatar = document.createElement('div');
      avatar.className = `agent-avatar ${agent.kind === 'codex' ? 'codex-large' : 'claude-large'}`;
      avatar.textContent = agent.kind === 'codex' ? '⌘' : '◎';
      const details = document.createElement('div');
      details.className = 'agent-details';
      const name = document.createElement('strong');
      name.textContent = agent.kind || 'Agente';
      const status = document.createElement('span');
      status.innerHTML = '<i class="online-dot"></i> En línea';
      details.append(name, status);
      const role = document.createElement('span');
      role.className = 'agent-role';
      role.textContent = agent.execution_status || agent.status || 'ACTIVO';
      row.append(avatar, details, role);
      agentList.append(row);
    });
  }
  $('#agentFooter').textContent = `Actualización automática · ${data.events.length} eventos`;
}

async function refreshState() {
  const refresh = $('#refreshButton');
  try {
    const response = await fetch('/api/state', { cache: 'no-store' });
    if (!response.ok) throw new Error('No se pudo leer el estado local.');
    renderState(await response.json());
    refresh?.classList.remove('sync-error');
  } catch (error) {
    $('#mcpConnection').classList.remove('online');
    $('#mcpConnectionText').textContent = 'SIN SERVIDOR';
    $('#topStatus').innerHTML = '<span class="pulse-dot"></span> ABRE CON npm start';
    refresh?.classList.add('sync-error');
    $('#currentTask').textContent = 'Inicia el servidor local con npm start';
  }
}

$('#runDemo').addEventListener('click', () => {
  const board = $('#tasks');
  board.scrollIntoView({ behavior: 'smooth', block: 'center' });
  board.classList.remove('board-highlight');
  void board.offsetWidth;
  board.classList.add('board-highlight');
  setTimeout(() => board.classList.remove('board-highlight'), 1500);
  showToast('Estas tarjetas reflejan las tareas de Concord.');
});

$('#refreshButton').addEventListener('click', async () => {
  await refreshState();
  showToast('Estado real de Concord actualizado.');
});

document.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') $('#runDemo').click();
});

refreshState();
setInterval(refreshState, 4000);
