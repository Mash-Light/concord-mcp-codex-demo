const completedStatuses = new Set(['complete', 'closed']);
const activeStatuses = new Set(['active', 'in_progress', 'assigned', 'review_ready']);

export function getTaskBucket(status) {
  const normalized = String(status || '').toLowerCase();
  if (completedStatuses.has(normalized)) return 'complete';
  if (activeStatuses.has(normalized)) return 'active';
  return 'todo';
}

export function getTaskStatusLabel(status) {
  const labels = {
    active: 'En progreso',
    in_progress: 'En progreso',
    assigned: 'Asignada',
    review_ready: 'Para revisión',
    complete: 'Completada',
    closed: 'Cerrada',
  };
  return labels[String(status || '').toLowerCase()] || 'Pendiente';
}

export function agentDisplayName(agent) {
  if (!agent) return 'Sin asignar';
  const value = String(agent).trim();
  if (!value) return 'Sin asignar';
  if (value.toLowerCase() === 'codex') return 'Codex';
  return value.replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function agentInitials(agent) {
  const name = agentDisplayName(agent);
  if (name === 'Sin asignar') return '—';
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

export function eventDisplayName(tool) {
  const labels = {
    start_work: 'Inició una tarea',
    claim_work: 'Reclamó una tarea',
    update_work: 'Actualizó el progreso',
    update_task: 'Actualizó el progreso',
    transfer_work: 'Transfirió una tarea',
    finish_work: 'Finalizó una tarea',
    handoff: 'Registró una entrega',
    close_task: 'Cerró una tarea',
  };
  const normalized = String(tool || '').toLowerCase();
  if (labels[normalized]) return labels[normalized];
  return normalized.replaceAll('_', ' ').replace(/^\w/, (letter) => letter.toUpperCase()) || 'Evento de workflow';
}

export function formatTimestamp(value, options = {}) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return 'Hora no disponible';
  return new Intl.DateTimeFormat('es-EC', {
    timeZone: 'America/Guayaquil',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  }).format(date);
}

export function toIsoDateTime(value) {
  const date = new Date(value);
  return value && !Number.isNaN(date.getTime()) ? date.toISOString() : '';
}

function asRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function normalizeTask(value) {
  const task = asRecord(value);
  return {
    taskId: String(task.task_id || ''),
    title: String(task.title || 'Tarea sin título'),
    status: String(task.status || 'todo'),
    agent: String(task.agent || ''),
    agentId: String(task.agent_id || task.assigned_agent_id || ''),
    updatedAt: task.updated_at || null,
    modules: Array.isArray(task.modules) ? task.modules.filter((module) => typeof module === 'string') : [],
  };
}

function normalizePresence(value) {
  const agent = asRecord(value);
  return {
    agentId: String(agent.agent_id || ''),
    kind: String(agent.kind || 'Agente'),
    summary: String(agent.summary || ''),
    executionStatus: String(agent.execution_status || agent.reported_status || agent.status || ''),
    liveness: String(agent.liveness || agent.heartbeat_liveness || 'unknown'),
    lastSeen: agent.last_seen || agent.heartbeat_at || null,
  };
}

function normalizeEvent(value) {
  const event = asRecord(value);
  return {
    taskId: String(event.task_id || ''),
    tool: String(event.tool || ''),
    status: String(event.status || ''),
    detail: typeof event.detail === 'string' ? event.detail : '',
    createdAt: event.created_at || null,
  };
}

export function createWorkspaceModel(payload) {
  const response = asRecord(payload);
  const state = asRecord(response.state);
  const tasks = Array.isArray(state.tasks) ? state.tasks.map(normalizeTask) : [];
  const presence = Array.isArray(state.presence) ? state.presence.map(normalizePresence) : [];
  const events = Array.isArray(response.events) ? response.events.map(normalizeEvent) : [];
  const liveAgents = presence.filter((agent) => agent.liveness === 'live');
  const buckets = { todo: [], active: [], complete: [] };

  for (const task of tasks) buckets[getTaskBucket(task.status)].push(task);
  for (const bucket of Object.values(buckets)) {
    bucket.sort((left, right) => new Date(right.updatedAt || 0) - new Date(left.updatedAt || 0));
  }

  const taskById = new Map(tasks.map((task) => [task.taskId, task]));
  const recentEvents = [...events]
    .filter((event) => event.tool || event.taskId)
    .sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0))
    .slice(0, 7);

  return {
    repository: String(response.repository || ''),
    generatedAt: state.generated_at || null,
    tasks,
    buckets,
    liveAgents,
    events,
    recentEvents,
    taskById,
    metrics: {
      agents: liveAgents.length,
      activeTasks: buckets.active.length,
      completedTasks: buckets.complete.length,
      events: Number.isFinite(Number(response.eventCount)) ? Number(response.eventCount) : events.length,
    },
  };
}
