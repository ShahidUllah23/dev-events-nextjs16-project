import mongoose, { type Mongoose } from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  // Fail fast on misconfiguration so runtime errors are obvious in all environments.
  throw new Error("Missing env var: MONGODB_URI");
}

// After the guard above, this is guaranteed to be a string.
const uri: string = MONGODB_URI;

type MongooseCache = {
  /** Resolved Mongoose instance (once connected). */
  conn: Mongoose | null;
  /** In-flight connection promise (used to de-dupe concurrent connects). */
  promise: Promise<Mongoose> | null;
};

declare global {
  var mongooseCache: MongooseCache | undefined;
}

// In development, Next.js can reload modules frequently. Storing the cache on `globalThis`
// ensures we reuse the same connection across reloads and avoid creating extra connections.
const cached: MongooseCache = globalThis.mongooseCache ?? {
  conn: null,
  promise: null,
};

globalThis.mongooseCache = cached;

export async function connectToDatabase(): Promise<Mongoose> {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    // `mongoose.connect` returns a Mongoose instance (not a raw MongoDB client).
    cached.promise = mongoose.connect(uri, {
      bufferCommands: false,
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
