/**
 * API Service for PDFMind backend
 */

const BASE_URL = import.meta.env.VITE_API_URL || '';

export async function getHealth() {
  const res = await fetch(`${BASE_URL}/api/health`);
  if (!res.ok) throw new Error('Failed to connect to backend.');
  return await res.json();
}

export async function getCurrentDocument() {
  const res = await fetch(`${BASE_URL}/api/document`);
  if (!res.ok) throw new Error('Failed to fetch document status.');
  return await res.json();
}

export async function deleteCurrentDocument() {
  const res = await fetch(`${BASE_URL}/api/document`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to clear document.');
  return await res.json();
}

export async function uploadPDF(file) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${BASE_URL}/api/upload`, {
    method: 'POST',
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || 'Failed to upload and process PDF.');
  }
  return data;
}

export async function loadSampleDocument() {
  const res = await fetch(`${BASE_URL}/api/upload-sample`, {
    method: 'POST',
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || 'Failed to load sample document.');
  }
  return data;
}

export async function sendQuestion(question, topK = null) {
  const payload = { question };
  if (topK) payload.top_k = topK;

  const res = await fetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || 'Failed to generate answer.');
  }
  return data;
}
