const express = require('express');
const multer = require('multer');
const neo4j = require('neo4j-driver');
const upload = multer({ dest: 'uploads/' });
const driver = neo4j.driver(process.env.NEO4J_URI, neo4j.auth.basic(process.env.NEO4J_USERNAME, process.env.NEO4J_PASSWORD));
const app = express();
app.post('/photos', upload.single('photo'), (req, res) => res.json({ ok: true }));
app.get('/api/cron/cleanup', (req, res) => res.json({ cleaned: true }));
app.listen(process.env.PORT || 3000, '0.0.0.0');
