import { v4 as uuidv4 } from 'uuid';
import { promises as fsPromises, mkdirSync, existsSync } from 'fs';
import path from 'path';
import { ObjectId } from 'mongodb';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';

const VALID_TYPES = ['folder', 'file', 'image'];

class FilesController {
  static async postUpload(req, res) {
    const token = req.headers['x-token'];
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { name, type, parentId = 0, isPublic = false, data } = req.body;

    if (!name) return res.status(400).json({ error: 'Missing name' });
    if (!type || !VALID_TYPES.includes(type)) return res.status(400).json({ error: 'Missing type' });
    if ((type === 'file' || type === 'image') && !data) return res.status(400).json({ error: 'Missing data' });

    let parentFolderId = parentId;
    if (parentId !== 0) {
      const parentFile = await dbClient.db.collection('files').findOne({ _id: new ObjectId(parentId) });
      if (!parentFile) return res.status(400).json({ error: 'Parent not found' });
      if (parentFile.type !== 'folder') return res.status(400).json({ error: 'Parent is not a folder' });
    }

    const userObjectId = new ObjectId(userId);
    const fileData = {
      userId: userObjectId,
      name,
      type,
      isPublic,
      parentId: parentId === 0 ? 0 : new ObjectId(parentId),
    };

    if (type === 'folder') {
      const result = await dbClient.db.collection('files').insertOne(fileData);
      fileData.id = result.insertedId.toString();
      return res.status(201).json({
        id: fileData.id,
        userId,
        name,
        type,
        isPublic,
        parentId,
      });
    }

    // Handle file or image
    const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
    if (!existsSync(folderPath)) mkdirSync(folderPath, { recursive: true });

    const fileName = uuidv4();
    const localPath = path.join(folderPath, fileName);

    try {
      const fileBuffer = Buffer.from(data, 'base64');
      await fsPromises.writeFile(localPath, fileBuffer);

      fileData.localPath = localPath;
      const result = await dbClient.db.collection('files').insertOne(fileData);

      return res.status(201).json({
        id: result.insertedId.toString(),
        userId,
        name,
        type,
        isPublic,
        parentId,
      });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to save file' });
    }
  }
}

export default FilesController;
