import "@/lib/serverOnly";
import mongoose from "mongoose";
import { getEnv } from "@/lib/validation/env";

declare global {
  var _mongooseConn: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  } | undefined;
}

const cached = globalThis._mongooseConn ?? { conn: null, promise: null };
globalThis._mongooseConn = cached;

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    const { MONGODB_URI } = getEnv();
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    throw error;
  }

  return cached.conn;
}
