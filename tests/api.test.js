import request from 'supertest';
import { MongoClient } from 'mongodb';
import app from '../server';
import dbClient from '../utils/db';

let userToken = '';
let fileId = '';

describe('API Endpoints', () => {
  beforeAll(async () => {
    // Clean up collections if needed before tests
    await dbClient.db.collection('users').deleteMany({});
    await dbClient.db.collection('files').deleteMany({});
  });

  test('GET /status', async () => {
    const res = await request(app).get('/status');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('redis');
    expect(res.body).toHaveProperty('db');
  });

  test('GET /stats', async () => {
    const res = await request(app).get('/stats');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('users');
    expect(res.body).toHaveProperty('files');
  });

  test('POST /users', async () => {
    const res = await request(app).post('/users').send({ email: 'bob@dylan.com', password: 'password' });
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('email', 'bob@dylan.com');
  });

  test('GET /connect', async () => {
    const res = await request(app)
      .get('/connect')
      .set('Authorization', 'Basic Ym9iQGR5bGFuLmNvbTpwYXNzd29yZA==');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
    userToken = res.body.token;
  });

  test('GET /users/me', async () => {
    const res = await request(app)
      .get('/users/me')
      .set('X-Token', userToken);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('email', 'bob@dylan.com');
  });

  test('POST /files', async () => {
    const res = await request(app)
      .post('/files')
      .set('X-Token', userToken)
      .send({ name: 'myText.txt', type: 'file', data: Buffer.from('Hello').toString('base64') });
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('id');
    fileId = res.body.id;
  });

  test('GET /files/:id', async () => {
    const res = await request(app)
      .get(`/files/${fileId}`)
      .set('X-Token', userToken);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('id', fileId);
  });

  test('GET /files', async () => {
    const res = await request(app)
      .get('/files')
      .set('X-Token', userToken);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('PUT /files/:id/publish', async () => {
    const res = await request(app)
      .put(`/files/${fileId}/publish`)
      .set('X-Token', userToken);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('isPublic', true);
  });

  test('PUT /files/:id/unpublish', async () => {
    const res = await request(app)
      .put(`/files/${fileId}/unpublish`)
      .set('X-Token', userToken);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('isPublic', false);
  });

  test('GET /files/:id/data', async () => {
    const res = await request(app)
      .get(`/files/${fileId}/data`)
      .set('X-Token', userToken);
    expect(res.statusCode).toBe(200);
  });
});
