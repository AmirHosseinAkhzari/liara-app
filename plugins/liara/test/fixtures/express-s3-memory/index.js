const express = require('express');
const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { Pool } = require('pg');

// Uploads stay in memory and go straight to S3.
const upload = multer({ storage: multer.memoryStorage() });
const s3 = new S3Client({ endpoint: process.env.S3_ENDPOINT, region: process.env.S3_REGION, forcePathStyle: true });
const db = new Pool({ connectionString: process.env.DATABASE_URL });
const legacyExport = 'old-orders.sqlite3'; // just a file name in a message, not a database

const app = express();
app.post('/photos', upload.single('photo'), async (req, res) => {
  await s3.send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: req.file.originalname, Body: req.file.buffer }));
  await db.query('insert into photos(name) values ($1)', [req.file.originalname]);
  res.json({ ok: true, note: `import ${legacyExport} by hand` });
});
app.listen(3000);
