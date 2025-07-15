import Redis from 'ioredis';
import 'dotenv/config';
export const createRedisClient = (): any => {
  const client = new Redis({
    host: process.env.REDIS_HOST ?? '',
    port: parseInt(process.env.REDIS_PORT) ?? 6379,
  });

  client.on('error', (err) => console.log('Redis Client Error', err));

  return client;
};
