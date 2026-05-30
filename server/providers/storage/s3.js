// providers/storage/s3.js
// S3-compatible storage adapter (AWS S3, Cloudflare R2, MinIO).
// Requires: STORAGE_PROVIDER=s3, S3_BUCKET, S3_REGION (default us-east-1),
//           S3_ENDPOINT (for R2/MinIO), S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY.

const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

let client;

function getClient() {
  if (!client) {
    const REGION = process.env.S3_REGION || 'us-east-1';
    const ENDPOINT = process.env.S3_ENDPOINT;
    const config = { region: REGION };
    if (ENDPOINT) {
      config.endpoint = ENDPOINT;
      config.forcePathStyle = true;
    }
    if (process.env.S3_ACCESS_KEY_ID) {
      if (!process.env.S3_SECRET_ACCESS_KEY) {
        throw new Error('S3_ACCESS_KEY_ID is set but S3_SECRET_ACCESS_KEY is missing');
      }
      config.credentials = {
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      };
    }
    client = new S3Client(config);
  }
  return client;
}

function requireBucket() {
  if (!process.env.S3_BUCKET) {
    throw new Error('S3_BUCKET environment variable is required for this operation');
  }
}

const uploadBuffer = async (key, buffer, contentType) => {
  requireBucket();
  const cmd = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });
  await getClient().send(cmd);
};

const deleteObject = async (key) => {
  requireBucket();
  const cmd = new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key });
  await getClient().send(cmd);
};

const getPublicUrl = async (key) => {
  requireBucket();
  const PUBLIC_URL_BASE = process.env.S3_PUBLIC_URL_BASE;
  if (PUBLIC_URL_BASE) {
    const base = PUBLIC_URL_BASE.replace(/\/+$/, '');
    return `${base}/${key}`;
  }
  const REGION = process.env.S3_REGION || 'us-east-1';
  return `https://${process.env.S3_BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
};

const getSignedReadUrl = async (key, expiresIn = 900) => {
  requireBucket();
  const cmd = new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key });
  return getSignedUrl(getClient(), cmd, { expiresIn });
};

const getObjectBuffer = async (key) => {
  requireBucket();
  const cmd = new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key });
  const response = await getClient().send(cmd);
  const chunks = [];
  for await (const chunk of response.Body) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
};

module.exports = { uploadBuffer, deleteObject, getPublicUrl, getSignedReadUrl, getObjectBuffer };
