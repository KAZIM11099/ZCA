import axios from 'axios';

let pendingRequests = 0;
let loaderTimer;

function updateGlobalLoader() {
  if (pendingRequests > 0) {
    if (loaderTimer) return;
    loaderTimer = window.setTimeout(() => {
      loaderTimer = undefined;
      if (pendingRequests > 0) window.dispatchEvent(new CustomEvent('zavikoo:loading', { detail: { active: true } }));
    }, 450);
    return;
  }
  if (loaderTimer) {
    window.clearTimeout(loaderTimer);
    loaderTimer = undefined;
  }
  window.dispatchEvent(new CustomEvent('zavikoo:loading', { detail: { active: false } }));
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  pendingRequests += 1;
  updateGlobalLoader();
  return config;
});

api.interceptors.response.use((response) => {
  pendingRequests = Math.max(0, pendingRequests - 1);
  updateGlobalLoader();
  return response;
}, (error) => {
  pendingRequests = Math.max(0, pendingRequests - 1);
  updateGlobalLoader();
  return Promise.reject(error);
});

export async function getData(path, params) {
  const response = await api.get(path, { params });
  return response.data.data;
}

