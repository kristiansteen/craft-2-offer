import { BACKEND_URL, authHeaders } from '../lib/api.js';

export async function fetchProjects(token) {
  const res = await fetch(`${BACKEND_URL}/api/v1/flows?app=craft2offer`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error('Failed to fetch projects');
  return res.json(); // [{ id, name, data, updatedAt, createdAt }]
}

export async function upsertProject(token, project) {
  const name = project.jobBreakdown?.title || project.name || 'Ny opgave';
  const res = await fetch(`${BACKEND_URL}/api/v1/flows/${project.id}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify({ name, data: project, appKey: 'craft2offer' }),
  });
  if (!res.ok) throw new Error('Failed to save project');
  return res.json();
}

export async function deleteProject(token, projectId) {
  const res = await fetch(`${BACKEND_URL}/api/v1/flows/${projectId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (!res.ok && res.status !== 404) throw new Error('Failed to delete project');
}
