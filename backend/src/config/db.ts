import mongoose from 'mongoose';

let isConnected = false;

function sanitizeMongoUri(rawUri: string): string {
  let uri = rawUri.trim();

  // If password contains an unescaped '@' (e.g. mongodb+srv://user:pass@word@cluster...)
  // We can safely encode the password part
  try {
    const srvMatch = uri.match(/^(mongodb(?:\+srv)?:\/\/)([^:]+):([^@]+)@(.+)$/);
    if (!srvMatch) {
      // Multiple @ found in the authority part
      const complexMatch = uri.match(/^(mongodb(?:\+srv)?:\/\/)([^:]+):(.*)@([^@]+)$/);
      if (complexMatch) {
        const prefix = complexMatch[1];
        const user = complexMatch[2];
        const pass = complexMatch[3];
        const host = complexMatch[4];
        uri = `${prefix}${user}:${encodeURIComponent(pass)}@${host}`;
      }
    }

    // Ensure database name is present before query parameters
    if (uri.includes('.mongodb.net/?') || uri.endsWith('.mongodb.net/')) {
      uri = uri.replace('.mongodb.net/?', '.mongodb.net/actify?');
      if (uri.endsWith('.mongodb.net/')) {
        uri = uri + 'actify';
      }
    }
  } catch {
    // If regex parsing fails, return original
  }

  return uri;
}

export async function connectDB(): Promise<boolean> {
  const rawUri = process.env.MONGODB_URI;

  if (!rawUri) {
    console.warn('⚠️  MONGODB_URI is not defined in .env. MongoDB features will run with in-memory fallback.');
    return false;
  }

  const uri = sanitizeMongoUri(rawUri);

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
    });
    isConnected = true;
    console.log(`✅ MongoDB connected successfully: ${conn.connection.host}/${conn.connection.name}`);
    return true;
  } catch (error: any) {
    console.warn(`⚠️  MongoDB connection failed: ${error?.message || error}`);
    console.warn('   (Actify will still run; MongoDB auth & deadline sync will retry on demand)');
    return false;
  }
}

export function isDbConnected(): boolean {
  return isConnected && mongoose.connection.readyState === 1;
}
