import redis from 'redis';

/**
 * Creates the RedisClient instance
 */
class RedisClient {
  constructor() {
    this.client = redis.createClient();
    this.isClientConnected = true;
    this.client.on('error', (err) => {
      console.error('Redis client failed to connect:', err.message || err.toString());
      this.isClientConnected = false;
    });
    this.client.on('connect', () => {
      this.isClientConnected = true;
    });
  }

  isAlive() {
    return this.isClientConnected;
  }

  async get(key) {
    return new Promise((resolve, reject) => {
      this.client.get(key, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  }

  async set(key, value, duration) {
    return new Promise((resolve, reject) => {
      this.client.setex(key, duration, value, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  }

  async del(key) {
    return new Promise((resolve, reject) => {
      this.client.del(key, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  }
}

const redisClient = new RedisClient();
export default redisClient;
