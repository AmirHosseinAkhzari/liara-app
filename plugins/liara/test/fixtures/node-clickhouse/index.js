const express = require('express');
const { createClient } = require('@clickhouse/client');

const clickhouse = createClient({
  url: process.env.CLICKHOUSE_HOST,
  username: process.env.CLICKHOUSE_USER,
  password: process.env.CLICKHOUSE_PASSWORD,
});

const app = express();
app.get('/events', async (req, res) => {
  const rows = await clickhouse.query({ query: 'SELECT * FROM events LIMIT 10', format: 'JSONEachRow' });
  res.json(await rows.json());
});
app.listen(3000);
