import { Router } from 'express';
import { prisma } from '../db.js';
import { env } from '../config/env.js';
import { pingRateLimitRedis } from '../services/rateLimiters.js';

const router = Router();

router.get('/live', (req, res) => {
  return res.json({ success: true, data: { status: 'ok', time: new Date().toISOString() } });
});

async function readiness(req, res) {
  const services = {
    database: 'error',
    redis: env.REDIS_URL ? 'error' : 'not_configured',
  };
  try {
    await prisma.$queryRaw`SELECT 1`;
    services.database = 'ok';
    if (env.REDIS_URL) {
      await pingRateLimitRedis();
      services.redis = 'ok';
    }
    return res.json({
      success: true,
      data: { status: 'ok', ...services, time: new Date().toISOString() },
    });
  } catch (error) {
    req.log?.error({
      errorType: error.name,
      errorCode: error.code,
      services,
    }, 'readiness check failed');
    return res.status(503).json({
      success: false,
      error: { message: 'Service is not ready.' },
      data: { status: 'not_ready', ...services, time: new Date().toISOString() },
    });
  }
}

router.get('/ready', readiness);
router.get('/', readiness);

export default router;
