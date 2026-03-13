/**
 * Test Setup
 * 
 * Configures environment for tests
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

// Set test database URL if not set
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/agentbranch_test';
}

// Disable real services in tests
process.env.OPENAI_API_KEY = '';
process.env.SEPOLIA_RPC_URL = '';
process.env.JWT_SECRET = 'test-jwt-secret';

// Suppress console.log in tests unless DEBUG is set
if (!process.env.DEBUG) {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
  };
}
