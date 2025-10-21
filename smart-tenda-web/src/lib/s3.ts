import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const client = new S3Client({ region: process.env.S3_REGION })

export async function uploadBuffer(key: string, buffer: Buffer, contentType = 'application/pdf') {
  const cmd = new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key, Body: buffer, ContentType: contentType })
  await client.send(cmd)
  return { key }
}

export function createPresignedPost(opts: { Bucket: string; Key: string; Expires?: number }) {
  // Minimal presign stub for prototype: return form fields for a simple POST to S3-compatible bucket
  return Promise.resolve({ url: `https://${opts.Bucket}.s3.${process.env.S3_REGION}.amazonaws.com/`, fields: { key: opts.Key } })
}
