import OpenAI from 'openai';
export const ai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const bucket = process.env.S3_BUCKET;
const s3 = { endpoint: process.env.S3_ENDPOINT, key: process.env.S3_ACCESS_KEY_ID, secret: process.env.S3_SECRET_ACCESS_KEY };
const r = process.env.RESEND_API_KEY; const st = process.env.STRIPE_SECRET_KEY; const x = process.env.SENTRY_DSN;
