import { ObjectId } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import { promises as fsPromises, mkdirSync, existsSync } from 'fs';
import path from 'path';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

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

    let parentObjectId = 0;
    if (parentId !== 0) {
      try {
        parentObjectId = new ObjectId(parentId);
      } catch (err) {
        return res.status(400).json({ error: 'Parent not found' });
      }

      const parentFile = await dbClient.db.collection('files').findOne({ _id: parentObjectId });
      if (!parentFile) return res.status(400).json({ error: 'Parent not found' });
      if (parentFile.type !== 'folder') return res.status(400).json({ error: 'Parent is not a folder' });
    }

    const fileDoc = {
      userId: new ObjectId(userId),
      name,
      type,
      isPublic,
      parentId: parentObjectId,
    };

    if (type === 'folder') {
      const result = await dbClient.db.collection('files').insertOne(fileDoc);
      return res.status(201).json({
        id: result.insertedId.toString(),
        userId,
        name,
        type,
        isPublic,
        parentId,
      });
    }

    // Handle file/image
    const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
    if (!existsSync(folderPath)) mkdirSync(folderPath, { recursive: true });

    const fileName = uuidv4();
    const localPath = path.join(folderPath, fileName);

    try {
      const fileBuffer = Buffer.from(data, 'base64');
      await fsPromises.writeFile(localPath, fileBuffer);

      fileDoc.localPath = localPath;

      const result = await dbClient.db.collection('files').insertOne(fileDoc);

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

  static async getShow(req, res) {
    const token = req.headers['x-token'];
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    let fileId;
    try {
      fileId = new ObjectId(req.params.id);
    } catch (err) {
      return res.status(404).json({ error: 'Not found' });
    }

    const file = await dbClient.db.collection('files').findOne({
      _id: fileId,
      userId: new ObjectId(userId),
    });

    if (!file) return res.status(404).json({ error: 'Not found' });

    return res.status(200).json({
      id: file._id.toString(),
      userId: file.userId.toString(),
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId === 0 ? 0 : file.parentId.toString(),
    });
  }

  static async getIndex(req, res) {
    const token = req.headers['x-token'];
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const parentId = req.query.parentId || '0';
    const page = parseInt(req.query.page || '0', 10);
    let parentQueryId = 0;

    if (parentId !== '0') {
      try {
        parentQueryId = new ObjectId(parentId);
      } catch (err) {
        return res.status(200).json([]); // invalid ObjectId, return empty
      }
    }

    const matchQuery = {
      userId: new ObjectId(userId),
      parentId: parentQueryId,
    };

    const files = await dbClient.db.collection('files')
      .aggregate([
        { $match: matchQuery },
        { $skip: page * 20 },
        { $limit: 20 },
      ])
      .toArray();

    const result = files.map((file) => ({
      id: file._id.toString(),
      userId: file.userId.toString(),
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId === 0 ? 0 : file.parentId.toString(),
    }));

    return res.status(200).json(result);
  }

  static async putPublish(req, res) {
    const token = req.headers['x-token'];
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    let fileId;
    try {
      fileId = new ObjectId(req.params.id);
    } catch (err) {
      return res.status(404).json({ error: 'Not found' });
    }

    const filter = {
      _id: fileId,
      userId: new ObjectId(userId),
    };

    const update = { $set: { isPublic: true } };

    const file = await dbClient.db.collection('files').findOneAndUpdate(
      filter,
      update,
      { returnOriginal: false }
    );

    if (!file.value) return res.status(404).json({ error: 'Not found' });

    const doc = file.value;
    return res.status(200).json({
      id: doc._id.toString(),
      userId: doc.userId.toString(),
      name: doc.name,
      type: doc.type,
      isPublic: doc.isPublic,
      parentId: doc.parentId === 0 ? 0 : doc.parentId.toString(),
    });
  }

  static async putUnpublish(req, res) {
    const token = req.headers['x-token'];
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    let fileId;
    try {
      fileId = new ObjectId(req.params.id);
    } catch (err) {
      return res.status(404).json({ error: 'Not found' });
    }

    const filter = {
      _id: fileId,
      userId: new ObjectId(userId),
    };

    const update = { $set: { isPublic: false } };

    const file = await dbClient.db.collection('files').findOneAndUpdate(
      filter,
      update,
      { returnOriginal: false }
    );

    if (!file.value) return res.status(404).json({ error: 'Not found' });

    const doc = file.value;
    return res.status(200).json({
      id: doc._id.toString(),
      userId: doc.userId.toString(),
      name: doc.name,
      type: doc.type,
      isPublic: doc.isPublic,
      parentId: doc.parentId === 0 ? 0 : doc.parentId.toString(),
    });
  }

  static async getFile(req, res) {
    const fileId = req.params.id;

    let file;
    try {
      file = await dbClient.db.collection('files').findOne({ _id: new ObjectId(fileId) });
    } catch (err) {
      return res.status(404).json({ error: 'Not found' });
    }

    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    const token = req.headers['x-token'];
    let userId = null;

    if (token) {
      userId = await redisClient.get(`auth_${token}`);
    }

    const isOwner = userId && file.userId.toString() === userId;
    if (!file.isPublic && !isOwner) {
      return res.status(404).json({ error: 'Not found' });
    }

    if (file.type === 'folder') {
      return res.status(400).json({ error: "A folder doesn't have content" });
    }

    if (!file.localPath || !fs.existsSync(file.localPath)) {
      return res.status(404).json({ error: 'Not found' });
    }

    const mimeType = mime.lookup(file.name) || 'application/octet-stream';
    res.setHeader('Content-Type', mimeType);

    try {
      const fileContent = fs.readFileSync(file.localPath);
      return res.status(200).send(fileContent);
    } catch (err) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export default FilesController;
