import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
const s3 = new S3Client({ endpoint: process.env.S3_ENDPOINT, region: "default" });
export async function uploadProductImage(key: string, body: Buffer) {
  await s3.send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key, Body: body }));
}
