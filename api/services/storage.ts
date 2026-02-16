import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

const ACCESS_KEY_ID = process.env.SUPABASE_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.SUPABASE_KEY;
const BUCKET_NAME = process.env.SUPABASE_BUCKET_NAME || 'receipts';
const SUPABASE_URL = process.env.SUPABASE_URL;

if (!ACCESS_KEY_ID || !SECRET_ACCESS_KEY || !SUPABASE_URL) {
  throw new Error('Supabase S3 credentials are required (URL, ACCESS_KEY_ID, KEY)');
}

const projectRef = SUPABASE_URL.replace('https://', '').split('.')[0];
const endpoint = `https://${projectRef}.storage.supabase.co/storage/v1/s3`;

const s3Client = new S3Client({
  forcePathStyle: true,
  region: 'us-east-1',
  endpoint: endpoint,
  credentials: {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
  },
});

export const uploadReceipt = async (file: Express.Multer.File, userId: string, expenseId: string) => {
  try {
    const fileName = `${userId}/${expenseId}`; 

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    await s3Client.send(command);
  } catch (error) {
    console.error('Error uploading file to S3:', error);
    throw error;
  }
};

export const deleteReceipt = async (userId: string, expenseId: string): Promise<void> => {
  try {
    const key = `${userId}/${expenseId}`;
    
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);
  } catch (error) {
    console.error('Error deleting file from S3:', error);
  }
};

export const downloadReceipt = async (userId: string, expenseId: string): Promise<{ stream: Readable, contentType: string }> => {
  try {
    const key = `${userId}/${expenseId}`;
    
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const response = await s3Client.send(command);
    
    if (!response.Body) {
      throw new Error('File not found or empty body');
    }

    return {
      stream: response.Body as Readable,
      contentType: response.ContentType || 'application/octet-stream',
    };
  } catch (error) {
    console.error('Error downloading file from S3:', error);
    throw error;
  }
};
