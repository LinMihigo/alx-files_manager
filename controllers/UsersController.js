import dbClient from '../utils/db';
import redisClient from '../utils/redis';
import { ObjectId } from 'mongodb'; // Required to query by _id


class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;

    if (!email) return res.status(400).json({ error: 'Missing email' });
    if (!password) return res.status(400).json({ error: 'Missing password' });

    const existingUser = await dbClient.db.collection('users').findOne({ email });
    if (existingUser) return res.status(400).json({ error: 'Already exist' });

    const crypto = require('crypto');
    const hashedPassword = crypto.createHash('sha1').update(password).digest('hex');

    const result = await dbClient.db.collection('users').insertOne({ email, password: hashedPassword });
    return res.status(201).json({ id: result.insertedId.toString(), email });
  }

  static async getMe(req, res) {
    const token = req.headers['x-token'];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const user = await dbClient.db.collection('users').findOne({ _id: new ObjectId(userId) });
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    return res.status(200).json({ id: user._id.toString(), email: user.email });
  }
}

export default UsersController;
