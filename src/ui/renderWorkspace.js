import { createWorkspaceModel, formatTimestamp, getTaskBucket } from '../domain/workspace.js';
import { makeActivityItem, makeAgentRow, makeEmptyState, makeTaskRow, setValue } from './components.js';
import { renderStaticIcons } from './icons.js';

const taskFilters = { query: '', bucket: 'all' };

function updateFeedState(state, message) {
  const sourceCard = document.querySelector('#sourceCard');
  const topStatus = document.querySelector('#topStatus');
  const sourcePill = document.querySelector('#sourcePill');
  const signalPanel = document.querySelector('#signalPanel');
  const labels = {
    loading: ['Conectando con el estado local', 'LEYENDO WORKSPACE', 'INICIANDO'],
    available: ['Archivos locales disponibles', 'FEED LOCAL DISPONIBLE', 'DISPONIBLE'],
    unavailable: ['No se puede leer el estado local', 'FEED LOCAL NO DISPONIBLE', 'SIN ACCESO'],
  };
  const current = labels[state] || labels.loading;
  sourceCard.dataset.state = state;
  topStatus.dataset.state = state;
  sourcePill.dataset.state = state;
  signalPanel.dataset.state = state;
  setValue('#sourceLabel', current[0]);
  setValue('#topStatus span', current[1]);
  setValue('#sourcePill span', current[2]);
  const warning = document.querySelector('#sourceWarning');
  warning.hidden = state !== 'unavailable';
  if (state === 'unavailable' && message) warning.lastElementChild.textContent = message;
}

function visibleTasks(model) {
  const query = taskFilters.query.trim().toLocaleLowerCase('es');
  return model.tasks.filter((task) => {
    const bucketMatches = taskFilters.bucket === 'all' || getTaskBucket(task.status) === taskFilters.bucket;
    const textMatches = !query || `${task.title} ${task.taskId} ${task.modules.join(' ')}`.toLocaleLowerCase('es').includes(query);
    return bucketMatches && textMatches;
  });
}

function renderTaskList(model) {
  const tasks = visibleTasks(model).sort((left, right) => new Date(right.updatedAt || 0) - new Date(left.updatedAt || 0));
  const list = document.querySelector('#taskList');
  list.replaceChildren(...tasks.map(makeTaskRow));
  document.querySelector('#taskEmpty').hidden = tasks.length > 0;

  const filterCounts = {
    all: model.tasks.length,
    todo: model.buckets.todo.length,
    active: model.buckets.active.length,
    complete: model.buckets.complete.length,
  };
  for (const [bucket, count] of Object.entries(filterCounts)) setValue(`#filter${bucket[0].toUpperCase()}${bucket.slice(1)}Count`, String(count).padStart(2, '0'));
  document.querySelectorAll('[data-task-filter]').forEach((button) => {
    const active = button.dataset.taskFilter === taskFilters.bucket;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  const query = taskFilters.query.trim();
  setValue('#taskSummary', query || taskFilters.bucket !== 'all'
    ? `${tasks.length} ${tasks.length === 1 ? 'coincidencia' : 'coincidencias'} en el workspace`
    : `${model.tasks.length} ${model.tasks.length === 1 ? 'tarea registrada' : 'tareas registradas'} en el workspace`);
}

function renderActivity(model) {
  const list = document.querySelector('#activityList');
  if (!model.recentEvents.length) {
    list.replaceChildren(makeEmptyState('Todavía no hay eventos de workflow en el archivo local.'));
    return;
  }
  list.replaceChildren(...model.recentEvents.map((event) => makeActivityItem(event, model.taskById.get(event.taskId))));
}

function renderAgents(model) {
  const list = document.querySelector('#agentList');
  const agents = model.liveAgents;
  setValue('#agentTotal', String(agents.length).padStart(2, '0'));
  setValue('#agentSummary', agents.length
    ? `${agents.length} ${agents.length === 1 ? 'agente reportado como presente' : 'agentes reportados como presentes'}`
    : 'No hay agentes con presencia activa reportada');
  setValue('#agentFooter', 'Presencia según el estado local de Concord');
  if (!agents.length) {
    list.replaceChildren(makeEmptyState('No hay agentes reportados como presentes en este momento.'));
    return;
  }
  list.replaceChildren(...agents.map(makeAgentRow));
}

export function setTaskSearch(query) {
  taskFilters.query = query;
}

export function setTaskFilter(bucket) {
  taskFilters.bucket = ['all', 'todo', 'active', 'complete'].includes(bucket) ? bucket : 'all';
}

export function setFeedLoading() {
  updateFeedState('loading');
}

export function setFeedAvailable() {
  updateFeedState('available');
}

export function setFeedUnavailable(message) {
  updateFeedState('unavailable', message || 'No se pudo actualizar el feed local. Los datos visibles pueden estar desactualizados.');
}

export function renderWorkspace(payload) {
  const model = createWorkspaceModel(payload);
  renderStaticIcons();
  updateFeedState('available');

  setValue('#activeAgents', model.metrics.agents);
  setValue('#activeTasks', model.metrics.activeTasks);
  setValue('#completedTasks', model.metrics.completedTasks);
  setValue('#eventCount', model.metrics.events);
  setValue('#navTaskCount', String(model.tasks.length).padStart(2, '0'));
  setValue('#navAgentCount', String(model.metrics.agents).padStart(2, '0'));
  setValue('#workspaceId', model.repository || 'Workspace local');
  setValue('#lastSync', formatTimestamp(model.generatedAt));

  renderTaskList(model);
  renderActivity(model);
  renderAgents(model);
  return model;
}
