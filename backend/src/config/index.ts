import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env file from root of the project
dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config(); // Fallback to current directory .env

export const CONFIG = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 5000,
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5436/privacy_db?schema=public',
  JWT_SECRET: process.env.JWT_SECRET || 'super_secret_jwt_signkey_for_digital_footprint_analyzer_2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  FACECHECK_API_KEY: process.env.FACECHECK_API_KEY || '',
};
