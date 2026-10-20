const WORK_MS = parseInt(process.env.SIMULATED_CPU_MS || '0', 10);
function simulateWork(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {} // busy loop: CPU-bound
}
const express = require('express');
const Redis = require('ioredis');
const os = require('os');
const crypto = require('crypto');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;
const INVENTORY_URL = process.env.INVENTORY_URL || 'http://localhost:3002';
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const INSTANCE = os.hostname();

// Lamport logical clock
let clock = 0;
app.use((req, res, next) => {
  const received = parseInt(req.header('x-lamport') || '0', 10);
  clock = Math.max(clock, received) + 1;
  res.set('x-lamport', String(clock));
  next();
});

// Release the lock only if we still own it
const RELEASE_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end`;

app.get('/health', (req, res) => res.json({ status: 'ok', instance: INSTANCE, lamport: clock }));

app.post('/book/:seatId', async (req, res) => {
  simulateWork(WORK_MS);
  const seatId = req.params.seatId;
  const lockKey = `lock:seat:${seatId}`;
  const token = crypto.randomUUID();

  // Mutual exclusion: only one request per seat can hold the lock
  const acquired = await redis.set(lockKey, token, 'PX', 5000, 'NX');
  if (!acquired) {
    return res.status(423).json({
      error: 'seat is being booked by another request',
      instance: INSTANCE, lamport: clock
    });
  }

  try {
    clock++;
    // Inter-service call (REST) to inventory, passing our Lamport time
    const r = await fetch(`${INVENTORY_URL}/seats/${seatId}/reserve`, {
      method: 'POST',
      headers: { 'x-lamport': String(clock) }
    });
    const data = await r.json();
    const remote = parseInt(r.headers.get('x-lamport') || '0', 10);
    clock = Math.max(clock, remote) + 1;

    if (!r.ok) {
      return res.status(r.status).json({ ...data, instance: INSTANCE, lamport: clock });
    }

    // Message-oriented communication: publish event for notification service
    clock++;
    await redis.publish('bookings', JSON.stringify({
      seat: seatId, instance: INSTANCE, lamport: clock, time: new Date().toISOString()
    }));

    res.json({ seat: seatId, status: 'booked', instance: INSTANCE, lamport: clock });
  } catch (err) {
    res.status(502).json({ error: 'inventory service unreachable', instance: INSTANCE });
  } finally {
    await redis.eval(RELEASE_SCRIPT, 1, lockKey, token);
  }
});

app.listen(PORT, () => console.log(`booking-service on ${PORT} (${INSTANCE})`));