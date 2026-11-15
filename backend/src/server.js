import app from './app.js';
import { env } from './config/env.js';
import { closeSessionEvents } from './services/sessionEvents.js';
import { closeRateLimitRedis } from './services/rateLimiters.js';
import { prisma } from './db.js';

const server = app.listen(env.PORT, () => console.log(`ZAVIKOO API listening on http://localhost:${env.PORT}`));
server.requestTimeout = 30_000;
server.headersTimeout = 35_000;
server.keepAliveTimeout = 65_000;
server.maxHeadersCount = 100;
let shuttingDown = false;

async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  const forceExit = setTimeout(() => {
    console.error('Graceful shutdown exceeded 10 seconds; forcing exit.');
    process.exit(1);
  }, 10_000);
  try {
    await closeSessionEvents();
  } catch (error) {
    console.error('Session-event shutdown failed.', error.name);
    process.exitCode = 1;
  }
  await new Promise((resolve) => server.close(resolve));
  try {
    await prisma.$disconnect();
  } catch (error) {
    console.error('Database shutdown failed.', error.name);
    process.exitCode = 1;
  }
  try {
    await closeRateLimitRedis();
  } catch (error) {
    console.error('Rate-limit Redis shutdown failed.', error.name);
    process.exitCode = 1;
  }
  clearTimeout(forceExit);
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection; shutting down.', {
    errorType: reason instanceof Error ? reason.name : typeof reason,
    errorCode: reason?.code,
  });
  process.exitCode = 1;
  void shutdown();
});
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception; shutting down.', {
    errorType: error.name,
    errorCode: error.code,
  });
  process.exitCode = 1;
  void shutdown();
});
