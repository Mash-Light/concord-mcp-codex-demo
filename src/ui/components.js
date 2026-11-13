import { agentDisplayName, agentInitials, eventDisplayName, formatTimestamp, getTaskBucket, getTaskStatusLabel, toIsoDateTime } from '../domain/workspace.js';
import { iconMarkup } from './icons.js';

function element(tagName, className, text) {
  const node = document.createElement(tagName);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function makeEmptyState(message) {
  const node = element('p', 'empty-state', message);
  return node;
}

export function makeTaskRow(task) {
  const bucket = getTaskBucket(task.status);
  const row = element('article', 'task-row');
  row.dataset.bucket = bucket;

  const main = element('div', 'task-row-main');
  const status = element('span', 'task-status');
  const statusDot = element('i');
  statusDot.setAttribute('aria-hidden', 'true');
  status.append(statusDot, document.createTextNode(getTaskStatusLabel(task.status)));
  const description = element('div', 'task-row-description');
  description.append(element('h3', '', task.title), element('p', 'task-modules', task.modules.length ? task.modules.join(' · ') : 'Sin módulos especificados'));
  main.append(status, description);

  const meta = element('div', 'task-row-meta');
  const owner = element('span', 'task-owner');
  owner.append(element('span', 'agent-avatar', agentInitials(task.agent)), element('span', '', agentDisplayName(task.agent)));
  const updated = element('time', 'task-updated', formatTimestamp(task.updatedAt));
  if (toIsoDateTime(task.updatedAt)) updated.dateTime = toIsoDateTime(task.updatedAt);
  meta.append(owner, updated, element('span', 'task-code', task.taskId || '—'));
  row.append(main, meta);
  return row;
}

export function makeActivityItem(event, task) {
  const row = element('article', 'activity-item');
  const iconName = event.tool === 'handoff' || event.tool === 'transfer_work' ? 'transfer'
    : event.tool === 'update_work' ? 'update'
      : event.tool === 'finish_work' || event.tool === 'close_task' ? 'check' : 'task';
  const icon = element('span', 'activity-icon');
  icon.innerHTML = iconMarkup(iconName);

  const copy = element('div', 'activity-copy');
  const title = element('p', 'activity-title', eventDisplayName(event.tool));
  const detailText = task ? `${task.taskId} · ${task.title}` : event.taskId || 'Evento del workspace';
  const detail = element('p', 'activity-detail', detailText);
  copy.append(title, detail);

  const time = element('time', 'activity-time', formatTimestamp(event.createdAt));
  if (toIsoDateTime(event.createdAt)) time.dateTime = toIsoDateTime(event.createdAt);
  row.append(icon, copy, time);
  return row;
}

export function makeAgentRow(agent) {
  const row = element('article', 'agent-row');
  const avatar = element('span', 'agent-avatar-large', agentInitials(agent.kind));
  const details = element('span', 'agent-details');
  const name = element('strong', '', agentDisplayName(agent.kind));
  const summary = agent.summary ? agent.summary.replace(/\s+/g, ' ').trim() : 'Sin actividad informada';
  const description = element('small', '', summary.length > 74 ? `${summary.slice(0, 71)}…` : summary);
  details.append(name, description);

  const status = element('span', 'agent-status');
  const dot = element('i');
  dot.setAttribute('aria-hidden', 'true');
  status.append(dot, document.createTextNode('Presente'));
  row.append(avatar, details, status);

  if (agent.lastSeen) {
    row.title = `Última presencia reportada ${formatTimestamp(agent.lastSeen)}`;
  }
  return row;
}

export function setValue(selector, value, root = document) {
  const target = root.querySelector(selector);
  if (target) target.textContent = String(value);
}
