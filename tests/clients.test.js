import redisClient from '../utils/redis';
import dbClient from '../utils/db';

describe('Redis Client', () => {
  it('should connect to Redis', async () => {
    expect(redisClient.isAlive()).resolves.toBe(true);
  });
});

describe('DB Client', () => {
  it('should connect to MongoDB', async () => {
    expect(dbClient.isAlive()).resolves.toBe(true);
  });
});
