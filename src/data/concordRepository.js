export async function loadWorkspaceState(signal) {
  const response = await fetch('/api/state', {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
    signal,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `El feed local respondió ${response.status}.`);
  }

  return response.json();
}
