/**
 * Auth Routes Tests
 */

import Fastify, { FastifyInstance } from 'fastify';
import { authRoutes } from '../routes/auth';
import { authPlugin, generateToken, verifyToken } from '../middleware/auth';
import { pool } from '../db/client';

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
  compare: jest.fn().mockImplementation((password, hash) => {
    return Promise.resolve(password === 'correct_password');
  }),
}));

// Mock database
jest.mock('../db/client', () => ({
  query: jest.fn(),
  queryOne: jest.fn(),
  pool: { end: jest.fn() },
}));

import { query, queryOne } from '../db/client';

describe('Auth Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    await app.register(authPlugin);
    await app.register(authRoutes, { prefix: '/auth' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/register', () => {
    it('should register a new user', async () => {
      (queryOne as jest.Mock).mockResolvedValue(null); // No existing user
      (query as jest.Mock).mockResolvedValue([{
        id: 'user-123',
        username: 'testuser',
        created_at: new Date().toISOString(),
      }]);

      const response = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          username: 'testuser',
          password: 'password123',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.user.username).toBe('testuser');
      expect(body.token).toBeDefined();
    });

    it('should reject short usernames', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          username: 'ab',
          password: 'password123',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should reject short passwords', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          username: 'testuser',
          password: 'short',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should reject existing usernames', async () => {
      (queryOne as jest.Mock).mockResolvedValue({ id: 'existing-user' });

      const response = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          username: 'existinguser',
          password: 'password123',
        },
      });

      expect(response.statusCode).toBe(409);
    });
  });

  describe('POST /auth/login', () => {
    it('should login with valid credentials', async () => {
      (queryOne as jest.Mock).mockResolvedValue({
        id: 'user-123',
        username: 'testuser',
        password_hash: 'hashed_password',
        created_at: new Date().toISOString(),
      });

      const bcrypt = require('bcryptjs');
      bcrypt.compare.mockResolvedValue(true);

      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          username: 'testuser',
          password: 'correct_password',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.token).toBeDefined();
    });

    it('should reject invalid credentials', async () => {
      (queryOne as jest.Mock).mockResolvedValue({
        id: 'user-123',
        username: 'testuser',
        password_hash: 'hashed_password',
      });

      const bcrypt = require('bcryptjs');
      bcrypt.compare.mockResolvedValue(false);

      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          username: 'testuser',
          password: 'wrong_password',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should reject non-existent user', async () => {
      (queryOne as jest.Mock).mockResolvedValue(null);

      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          username: 'nonexistent',
          password: 'password123',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /auth/me', () => {
    it('should return user info with valid token', async () => {
      const token = generateToken('user-123', 'testuser');
      
      (queryOne as jest.Mock).mockResolvedValue({
        id: 'user-123',
        username: 'testuser',
        created_at: new Date().toISOString(),
      });

      (query as jest.Mock).mockResolvedValue([]);

      const response = await app.inject({
        method: 'GET',
        url: '/auth/me',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.user.username).toBe('testuser');
    });

    it('should reject without token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/auth/me',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should reject invalid token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/auth/me',
        headers: {
          authorization: 'Bearer invalid-token',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });
});

describe('Auth Middleware', () => {
  describe('generateToken', () => {
    it('should generate a valid JWT', () => {
      const token = generateToken('user-123', 'testuser');
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const token = generateToken('user-123', 'testuser');
      const payload = verifyToken(token);
      
      expect(payload).not.toBeNull();
      expect(payload?.userId).toBe('user-123');
      expect(payload?.username).toBe('testuser');
    });

    it('should return null for invalid token', () => {
      const payload = verifyToken('invalid-token');
      expect(payload).toBeNull();
    });
  });
});
