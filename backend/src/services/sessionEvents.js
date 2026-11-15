import { SESSION_COOKIE, sessionCookieOptions } from './sessions.js';

const clientsByUser = new Map();
let heartbeat;

function removeClient(userId, response) {
  const clients = clientsByUser.get(userId);
  if (!clients) return;
  clients.delete(response);
  if (clients.size === 0) clientsByUser.delete(userId);
  if (clientsByUser.size === 0 && heartbeat) {
    clearInterval(heartbeat);
    heartbeat = undefined;
  }
}

function notifyUser(userId, reason) {
  const clients = clientsByUser.get(userId);
  if (!clients) return;
  for (const response of clients) {
    if (!response.writableEnded) {
      response.clearCookie(SESSION_COOKIE, sessionCookieOptions());
      response.write(`event: session-revoked\ndata: ${JSON.stringify({ reason })}\n\n`);
      response.end();
    }
    removeClient(userId, response);
  }
}

export function subscribeToCustomerSession(userId, response) {
  let clients = clientsByUser.get(userId);
  if (!clients) {
    clients = new Set();
    clientsByUser.set(userId, clients);
  }
  clients.add(response);

  if (!heartbeat) {
    heartbeat = setInterval(() => {
      for (const userClients of clientsByUser.values()) {
        for (const client of userClients) {
          if (!client.writableEnded) client.write(': keep-alive\n\n');
        }
      }
    }, 25_000);
    heartbeat.unref();
  }

  return () => removeClient(userId, response);
}

export function publishCustomerSessionRevoked(userId, reason = 'account-blocked') {
  notifyUser(userId, reason);
}

export async function closeSessionEvents() {
  if (heartbeat) clearInterval(heartbeat);
  heartbeat = undefined;
  for (const clients of clientsByUser.values()) {
    for (const response of clients) response.end();
  }
  clientsByUser.clear();
}

