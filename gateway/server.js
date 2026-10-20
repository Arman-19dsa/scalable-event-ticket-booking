const express = require('express');
const os = require('os');
const path = require('path');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const BOOKING_URL = process.env.BOOKING_URL || 'http://localhost:3001';
const INVENTORY_URL = process.env.INVENTORY_URL || 'http://localhost:3002';
const NOTIFICATION_URL = process.env.NOTIFICATION_URL || 'http://localhost:3003';
const INSTANCE = os.hostname();

// Serve the demo web page (public/index.html) from the gateway itself
app.use(express.static(path.join(__dirname, 'public')));

// Lamport logical clock
let clock = 0;

// Forward a request to a backend service and relay the response
async function forward(method, url, res) {
  clock++;
  try {
    const r = await fetch(url, {
      method,
      headers: { 'x-lamport': String(clock) },
      signal: AbortSignal.timeout(5000)
    });
    const remote = parseInt(r.headers.get('x-lamport') || '0', 10);
    clock = Math.max(clock, remote) + 1;
    const data = await r.json();
    res.status(r.status).json({ ...data, gatewayLamport: clock });
  } catch (err) {
    res.status(503).json({ error: 'backend service unavailable', gatewayLamport: clock });
  }
}

app.get('/api/seats', (req, res) => forward('GET', `${INVENTORY_URL}/seats`, res));
app.post('/api/book/:seatId', (req, res) => forward('POST', `${BOOKING_URL}/book/${req.params.seatId}`, res));
app.get('/api/notifications', (req, res) => forward('GET', `${NOTIFICATION_URL}/notifications`, res));

// Demo helper: clears all bookings and notifications so the demo can be repeated
app.post('/api/reset', (req, res) => forward('POST', `${INVENTORY_URL}/admin/reset`, res));

// Aggregated health check of all services
app.get('/api/health', async (req, res) => {
  const services = {
    booking: `${BOOKING_URL}/health`,
    inventory: `${INVENTORY_URL}/health`,
    notification: `${NOTIFICATION_URL}/health`
  };
  const result = { gateway: { status: 'ok', instance: INSTANCE } };
  await Promise.all(Object.entries(services).map(async ([name, url]) => {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(2000) });
      result[name] = await r.json();
    } catch {
      result[name] = { status: 'down' };
    }
  }));
  res.json(result);
});

app.listen(PORT, () => console.log(`gateway on ${PORT} (${INSTANCE})`));