const paths = {
  overview: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
  tasks: '<rect x="4" y="3.5" width="16" height="17" rx="2.5"/><path d="M8 9h8M8 13h8M8 17h5"/>',
  agents: '<path d="M16 20v-1.5a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4V20"/><circle cx="10" cy="7" r="3.5"/><path d="M17 11a3.5 3.5 0 0 0 0-7M20 20v-1.5a4 4 0 0 0-2.7-3.8"/>',
  activity: '<path d="M3 12h4l2.2-6 4.1 12 2.2-6H21"/>',
  workspace: '<path d="m12 3 8.5 4.8L12 12.5 3.5 7.8 12 3Z"/><path d="m3.5 12 8.5 4.8 8.5-4.8M3.5 16.2 12 21l8.5-4.8"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  arrow: '<path d="M4 12h15M13 6l6 6-6 6"/>',
  codex: '<path d="M8.5 4.5 4 9l4.5 4.5M15.5 4.5 20 9l-4.5 4.5M13.5 3l-3 16"/>',
  concord: '<circle cx="12" cy="12" r="8.5"/><path d="M15.5 8.5a5 5 0 1 0 0 7M12 3.5v2M20.5 12h-2"/>',
  database: '<ellipse cx="12" cy="5.5" rx="7.5" ry="3"/><path d="M4.5 5.5v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-6M4.5 11.5v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-6"/>',
  orbit: '<circle cx="12" cy="12" r="2.2"/><ellipse cx="12" cy="12" rx="9" ry="4.8" transform="rotate(-35 12 12)"/><circle cx="18.7" cy="7.2" r="1" fill="currentColor" stroke="none"/>',
  check: '<path d="m5 12.5 4.2 4.2L19.5 6.5"/>',
  pulse: '<path d="M3 12h3.5l2.1-5.5L13 18l2.5-6H21"/><circle cx="18.5" cy="5" r="1.2" fill="currentColor" stroke="none"/>',
  search: '<circle cx="10.8" cy="10.8" r="6.3"/><path d="m16 16 4.2 4.2"/>',
  refresh: '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.6 9a7 7 0 0 1 11.5-2L20 12M4 12l2.9 5a7 7 0 0 0 11.5-2"/>',
  warning: '<path d="M12 3.8 21 20H3l9-16.2Z"/><path d="M12 9v4.5M12 17h.01"/>',
  task: '<circle cx="12" cy="12" r="8.5"/><path d="m8.5 12 2.3 2.3 4.8-5"/>',
  transfer: '<path d="M4 7h14M14 3l4 4-4 4M20 17H6m4-4-4 4 4 4"/>',
  update: '<path d="M5 19.5h14M7 16l9.5-9.5 2 2L9 18H7v-2Z"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/>',
};

export function iconMarkup(name, className = '') {
  const content = paths[name];
  if (!content) return '';
  const classAttribute = className ? ` class="${className}"` : '';
  return `<svg${classAttribute} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${content}</svg>`;
}

export function renderStaticIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach((element) => {
    element.innerHTML = iconMarkup(element.dataset.icon);
  });
}
