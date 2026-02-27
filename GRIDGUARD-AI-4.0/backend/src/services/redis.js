import { createClient } from "redis";

let client = null;

export const getRedis = async () => {
  if (!process.env.REDIS_URL) return null;
  if (client) return client;
  client = createClient({ url: process.env.REDIS_URL });
  client.on("error", (err) => console.error("Redis error", err));
  await client.connect();
  return client;
};
