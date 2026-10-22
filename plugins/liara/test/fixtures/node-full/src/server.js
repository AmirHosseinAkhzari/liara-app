const express = require('express');
const cron = require('node-cron');
const app = express();
app.get('/healthz', (req, res) => res.json({ ok: true }));
app.get('/orders', (req, res) => res.json([]));
cron.schedule('0 * * * *', () => console.log('hourly cleanup'));
app.listen(process.env.PORT || 3000, 'localhost');
