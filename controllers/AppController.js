// controllers/AppController.js
import redisClient from '../utils/redis.js';
import dbClient from '../utils/db.js';

class AppController {
  static getStatus(req, res) {
    res.status(200).json({
      redis: redisClient.isAlive(),
      db: dbClient.isAlive(),
    });
  }

  static async getStats(req, res) {
    try {
      const users = await dbClient.nbUsers();
      const files = await dbClient.nbFiles();
      res.status(200).json({ users, files });
    } catch (err) {
      console.error('Error in getStats:', err.message);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export default AppController;
