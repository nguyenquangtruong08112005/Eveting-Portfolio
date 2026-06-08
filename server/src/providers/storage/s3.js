// providers/storage/s3.js
// S3-compatible storage adapter (AWS S3, Cloudflare R2, MinIO).
// Requires: STORAGE_PROVIDER=s3, S3_BUCKET, S3_REGION (default us-east-1),
//           S3_ENDPOINT (for R2/MinIO), S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY.

const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const envConfig = require('@/shared/config/env.config');

let client;

function getClient() {
  if (!client) {
    const REGION = envConfig.s3.region;
    const ENDPOINT = envConfig.s3.endpoint;
    const s3config = { region: REGION };
    if (ENDPOINT) {
      s3config.endpoint = ENDPOINT;
      s3config.forcePathStyle = true;
    }
    if (envConfig.s3.accessKeyId) {
      if (!envConfig.s3.secretAccessKey) {
        throw new Error('S3_ACCESS_KEY_ID is set but S3_SECRET_ACCESS_KEY is missing');
      }
      s3config.credentials = {
        accessKeyId: envConfig.s3.accessKeyId,
        secretAccessKey: envConfig.s3.secretAccessKey,
      };
    }
    client = new S3Client(s3config);
  }
  return client;
}

function requireBucket() {
  if (!envConfig.s3.bucket) {
    throw new Error('S3_BUCKET environment variable is required for this operation');
  }
}

const uploadBuffer = async (key, buffer, contentType) => {
  requireBucket();
  const cmd = new PutObjectCommand({
    Bucket: envConfig.s3.bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });
  await getClient().send(cmd);
};

const deleteObject = async (key) => {
  requireBucket();
  const cmd = new DeleteObjectCommand({ Bucket: envConfig.s3.bucket, Key: key });
  await getClient().send(cmd);
};

const getPublicUrl = async (key) => {
  requireBucket();
  const PUBLIC_URL_BASE = envConfig.s3.publicUrlBase;
  if (PUBLIC_URL_BASE) {
    const base = PUBLIC_URL_BASE.replace(/\/+$/, '');
    return `${base}/${key}`;
  }
  const REGION = envConfig.s3.region;
  return `https://${envConfig.s3.bucket}.s3.${REGION}.amazonaws.com/${key}`;
};

const getSignedReadUrl = async (key, expiresIn = 900) => {
  requireBucket();
  const cmd = new GetObjectCommand({ Bucket: envConfig.s3.bucket, Key: key });
  return getSignedUrl(getClient(), cmd, { expiresIn });
};

const getObjectBuffer = async (key) => {
  requireBucket();
  const cmd = new GetObjectCommand({ Bucket: envConfig.s3.bucket, Key: key });
  const response = await getClient().send(cmd);
  const chunks = [];
  for await (const chunk of response.Body) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
};

const getObjectMetadata = async (key) => {
  requireBucket();
  const cmd = new HeadObjectCommand({ Bucket: envConfig.s3.bucket, Key: key });
  const response = await getClient().send(cmd);
  return { contentType: response.ContentType };
};

module.exports = { uploadBuffer, deleteObject, getPublicUrl, getSignedReadUrl, getObjectBuffer, getObjectMetadata };
