import mongoose from "mongoose";
import dns from "dns";

dns.setServers(["8.8.8.8", "8.8.4.4"]);
dns.promises.setServers(["8.8.8.8", "8.8.4.4"]);

const rawMongoUri = process.env.MONGODB_URI;
const MONGODB_URI = rawMongoUri?.replace(
  /^(mongodb(?:\+srv)?:\/\/[^/]+)\/{2,}/,
  "$1/"
) || "";

if (!MONGODB_URI) {
  throw new Error("Please define MONGODB_URI in your .env file");
}

// Cache the connection across hot reloads in dev, and across invocations in serverless
let cached = (global as any).mongoose;
if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

export async function connectMongo() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI).then((m) => m);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
