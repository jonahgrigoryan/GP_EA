import { randomUUID } from 'crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const EXPIRES_IN_SECONDS = 900;
const ALLOWED_CONTENT_TYPES = new Set(['image/jpeg', 'image/heic', 'image/heif']);
const ALLOWED_EXTS = new Set(['jpg', 'heic']);

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-awcs-capture-key',
  'Access-Control-Max-Age': '600',
};

function buildHeaders(extra = {}) {
  return {
    ...CORS_HEADERS,
    ...extra,
  };
}

function toLowerHeaders(headers = {}) {
  const out = {};
  for (const [key, value] of Object.entries(headers)) {
    if (typeof key === 'string') out[key.toLowerCase()] = value;
  }
  return out;
}

function jsonResponse(statusCode, payload, extraHeaders = {}) {
  return {
    statusCode,
    headers: buildHeaders({ 'Content-Type': 'application/json', ...extraHeaders }),
    body: JSON.stringify(payload),
  };
}

function missingEnvResponse() {
  return jsonResponse(500, {
    error: 'Server misconfigured: missing required AWS environment variables.',
  });
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: buildHeaders(),
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, {
      error: 'Method not allowed. Use POST.',
    });
  }

  const headers = toLowerHeaders(event.headers || {});
  const configuredApiKey = process.env.AWCS_CAPTURE_API_KEY?.trim();
  const incomingApiKey = headers['x-awcs-capture-key'];
  if (configuredApiKey && incomingApiKey !== configuredApiKey) {
    return jsonResponse(403, {
      error: 'Missing or invalid x-awcs-capture-key',
    });
  }

  const requiredEnv = [
    'AWS_REGION',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'AWCS_S3_BUCKET',
  ];
  for (const name of requiredEnv) {
    if (!process.env[name]) return missingEnvResponse();
  }

  let payload = {};
  try {
    payload = event.body ? JSON.parse(event.body) : {};
  } catch (err) {
    return jsonResponse(400, {
      error: 'Invalid JSON body',
    });
  }

  const { content_type, file_ext } = payload;
  if (!ALLOWED_CONTENT_TYPES.has(content_type) || !ALLOWED_EXTS.has(file_ext)) {
    return jsonResponse(400, {
      error: 'Invalid input: content_type must be image/jpeg|image/heic|image/heif and file_ext must be jpg|heic',
    });
  }

  const capture_id = randomUUID();
  const bucket = process.env.AWCS_S3_BUCKET;
  const region = process.env.AWS_REGION;
  const photoKey = `captures/${capture_id}/photo.${file_ext}`;
  const summaryKey = `captures/${capture_id}/summary.json`;

  const s3 = new S3Client({
    region,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  try {
    const photo_put_url = await getSignedUrl(
      s3,
      new PutObjectCommand({
        Bucket: bucket,
        Key: photoKey,
        ContentType: content_type,
      }),
      { expiresIn: EXPIRES_IN_SECONDS },
    );

    const summary_put_url = await getSignedUrl(
      s3,
      new PutObjectCommand({
        Bucket: bucket,
        Key: summaryKey,
        ContentType: 'application/json',
      }),
      { expiresIn: EXPIRES_IN_SECONDS },
    );

    return jsonResponse(200, {
      capture_id,
      photo_put_url,
      summary_put_url,
      expires_in_seconds: EXPIRES_IN_SECONDS,
    });
  } catch (error) {
    return jsonResponse(500, {
      error: 'Failed to generate pre-signed URL',
      detail: error?.message || 'Unknown error',
    });
  }
}
