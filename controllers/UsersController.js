import dbClient from '../utils/db';
import crypto from 'crypto';

class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }

    if (!password) {
      return res.status(400).json({ error: 'Missing password' });
    }

    try {
      const existingUser = await dbClient.db.collection('users').findOne({ email });
      if (existingUser) {
        return res.status(400).json({ error: 'Already exist' });
      }

      const hashedPassword = crypto.createHash('sha1').update(password).digest('hex');
      const result = await dbClient.db.collection('users').insertOne({ email, password: hashedPassword });

      return res.status(201).json({ id: result.insertedId.toString(), email });
    } catch (err) {
      return res.status(500).json({ error: 'Server error' });
    }
  }
}

export default UsersController;
