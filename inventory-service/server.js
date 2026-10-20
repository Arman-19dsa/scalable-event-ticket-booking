const express = require('express');
const Redis = require('ioredis');

const app = express();
app.use(express.json());
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Lamport logical clock
let clock = 0;
app.use((req, res, next) => {
  const received = parseInt(req.header('x-lamport') || '0', 10);
  clock = Math.max(clock, received) + 1;
  res.set('x-lamport', String(clock));
  next();
});

const TOTAL_SEATS = 20;

app.get('/health', (req, res) => res.json({ status: 'ok', lamport: clock }));

app.get('/seats', async (req, res) => {
  const booked = await redis.smembers('booked');
  res.json({ total: TOTAL_SEATS, booked, lamport: clock });
});

app.post('/seats/:id/reserve', async (req, res) => {
  const id = req.params.id;
  if (id < 1 || id > TOTAL_SEATS) return res.status(400).json({ error: 'invalid seat' });
  const added = await redis.sadd('booked', id); // 1 = newly booked, 0 = already taken
  if (added === 0) return res.status(409).json({ error: 'seat already booked', lamport: clock });
  res.json({ seat: id, status: 'reserved', lamport: clock });
});

// Demo helper: clears all bookings and the notification log so the demo can be repeated
app.post('/admin/reset', async (req, res) => {
  await redis.del('booked', 'notifications');
  res.json({ status: 'reset', lamport: clock });
});

app.listen(3002, () => console.log('inventory-service on 3002'));