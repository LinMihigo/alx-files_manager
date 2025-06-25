import { fileQueue } from './utils/queue';
import dbClient from './utils/db';
import { ObjectId } from 'mongodb';
import imageThumbnail from 'image-thumbnail';
import fs from 'fs';
import path from 'path';

fileQueue.process(async (job) => {
  const { userId, fileId } = job.data;

  if (!fileId) throw new Error('Missing fileId');
  if (!userId) throw new Error('Missing userId');

  const file = await dbClient.db.collection('files').findOne({
    _id: ObjectId(fileId),
    userId: ObjectId(userId),
  });

  if (!file) throw new Error('File not found');
  if (file.type !== 'image') return;

  const sizes = [500, 250, 100];

  for (const size of sizes) {
    try {
      const thumbnail = await imageThumbnail(file.localPath, { width: size });
      const thumbPath = `${file.localPath}_${size}`;
      fs.writeFileSync(thumbPath, thumbnail);
    } catch (err) {
      console.error(`Failed to generate thumbnail (${size}):`, err.message);
    }
  }
});
