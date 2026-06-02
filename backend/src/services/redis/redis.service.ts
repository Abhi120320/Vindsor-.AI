import Redis from "ioredis";
import { env } from "../../config/env";

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

export const cacheGet = async <T>(key: string): Promise<T | null> => {
  const value = await redis.get(key);
  return value ? (JSON.parse(value) as T) : null;
};

export const cacheSet = async (key: string, value: unknown, ttlSec = 60) => {
  await redis.set(key, JSON.stringify(value), "EX", ttlSec);
};
