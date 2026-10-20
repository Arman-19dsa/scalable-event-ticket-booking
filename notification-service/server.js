const express = require('express');
const Redis = require('ioredis');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3003;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const INSTANCE = os.hostname();

const sub = new Redis(REDIS_URL);   // subscriber connection
const redis = new Redis(REDIS_URL); // normal connection

let clock = 0;
const MAX_LOG = 50;

sub.subscribe('bookings', (err) => {
  if (err) return console.error('subscribe failed', err);
  console.log('subscribed to "bookings" channel');
});

sub.on('message', async (channel, message) => {
  const event = JSON.parse(message);
  clock = Math.max(clock, event.lamport || 0) + 1;
  const note = {
    text: `Confirmation: seat ${event.seat} booked`,
    from: event.instance,
    eventLamport: event.lamport,
    notifiedLamport: clock,
    time: event.time
  };
  console.log(note.text, `(booking lamport=${event.lamport}, notify lamport=${clock})`);
  await redis.lpush('notifications', JSON.stringify(note));
  await redis.ltrim('notifications', 0, MAX_LOG - 1);
});

app.get('/health', (req, res) => res.json({ status: 'ok', instance: INSTANCE, lamport: clock }));

app.get('/notifications', async (req, res) => {
  const items = await redis.lrange('notifications', 0, MAX_LOG - 1);
  res.json({ count: items.length, notifications: items.map(i => JSON.parse(i)) });
});

app.listen(PORT, () => console.log(`notification-service on ${PORT} (${INSTANCE})`));