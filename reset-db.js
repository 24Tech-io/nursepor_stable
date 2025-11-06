import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const client = postgres(process.env.DATABASE_URL);

async function resetDatabase() {
  try {
    console.log('Resetting database...');
    await client`DROP SCHEMA public CASCADE`;
    await client`CREATE SCHEMA public`;
    await client`GRANT ALL ON SCHEMA public TO neondb_owner`;
    await client`GRANT ALL ON SCHEMA public TO public`;
    console.log('Database reset successfully.');
  } catch (error) {
    console.error('Error resetting database:', error);
  } finally {
    await client.end();
  }
}

resetDatabase();
