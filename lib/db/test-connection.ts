// Quick test to check database connection
import 'dotenv/config';
import { db } from './index';

async function testConnection() {
  try {
    console.log('Testing database connection...');
    const result = await db.execute('SELECT NOW()');
    console.log('✓ Database connection successful:', result);
  } catch (error) {
    console.error('❌ Database connection failed:', error);
  }
}

testConnection();