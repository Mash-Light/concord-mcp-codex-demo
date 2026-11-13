import { loadWorkspaceState } from './src/data/concordRepository.js';
import { renderWorkspace, setFeedAvailable, setFeedLoading, setFeedUnavailable, setTaskFilter, setTaskSearch } from './src/ui/renderWorkspace.js';
import { renderStaticIcons } from './src/ui/icons.js';

const refreshButton = document.querySelector('#refreshButton');
const taskSearch = document.querySelector('#taskSearch');
const menuToggle = document.querySelector('#menuToggle');
const navBackdrop = document.querySelector('#navBackdrop');
const sidebar = document.querySelector('#sidebar');
const toast = document.querySelector('#toast');

let lastPayload = null;
let lastSignature = '';
let isRefreshing = false;
let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('is-visible');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 2400);
}

function setNavigationOpen(open) {
  document.body.classList.toggle('nav-open', open);
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? 'Cerrar navegación' : 'Abrir navegación');
  navBackdrop.hidden = !open;
  if (open) sidebar.querySelector('a[href="#overview"]')?.focus();
  else menuToggle.focus({ preventScroll: true });
}

async function refreshWorkspace({ announce = false } = {}) {
  if (isRefreshing) return;
  isRefreshing = true;
  refreshButton.disabled = true;
  refreshButton.classList.add('is-loading');

  try {
    const payload = await loadWorkspaceState();
    const signature = JSON.stringify(payload);
    if (signature !== lastSignature) {
      lastPayload = payload;
      lastSignature = signature;
      setTaskSearch(taskSearch.value);
      renderWorkspace(payload);
    } else {
      setFeedAvailable();
    }
    if (announce) showToast('Feed local actualizado.');
  } catch {
    setFeedUnavailable('No se pudo actualizar el feed local. Los datos visibles pueden estar desactualizados.');
    if (announce) showToast('No se pudo leer el feed local.');
  } finally {
    isRefreshing = false;
    refreshButton.disabled = false;
    refreshButton.classList.remove('is-loading');
  }
}

renderStaticIcons();
setFeedLoading();
refreshWorkspace();
window.setInterval(() => {
  if (!document.hidden) refreshWorkspace();
}, 5500);

refreshButton.addEventListener('click', () => refreshWorkspace({ announce: true }));

taskSearch.addEventListener('input', () => {
  setTaskSearch(taskSearch.value);
  if (lastPayload) renderWorkspace(lastPayload);
});

document.querySelectorAll('[data-task-filter]').forEach((button) => {
  button.addEventListener('click', () => {
    setTaskFilter(button.dataset.taskFilter);
    if (lastPayload) renderWorkspace(lastPayload);
  });
});

menuToggle.addEventListener('click', () => setNavigationOpen(menuToggle.getAttribute('aria-expanded') !== 'true'));
navBackdrop.addEventListener('click', () => setNavigationOpen(false));

sidebar.querySelectorAll('.nav-item').forEach((link) => {
  link.addEventListener('click', () => {
    sidebar.querySelectorAll('.nav-item').forEach((item) => {
      item.classList.toggle('is-active', item === link);
      if (item === link) item.setAttribute('aria-current', 'page');
      else item.removeAttribute('aria-current');
    });
    if (window.matchMedia('(max-width: 900px)').matches) setNavigationOpen(false);
  });
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && document.body.classList.contains('nav-open')) setNavigationOpen(false);
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    taskSearch.focus();
  }
});
