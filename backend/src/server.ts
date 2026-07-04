import app from './app';
import { CONFIG } from './config';
import prisma from './services/db';

async function bootstrap() {
  try {
    console.log('Connecting to PostgreSQL database...');
    await prisma.$connect();
    console.log('Database connection established successfully.');

    app.listen(CONFIG.PORT, () => {
      console.log(`===============================================`);
      console.log(`   Digital Footprint Analyzer Backend Active   `);
      console.log(`   Running on port: http://localhost:${CONFIG.PORT} `);
      console.log(`===============================================`);
    });
  } catch (error) {
    console.error('Fatal: Failed to bootstrap backend service:', error);
    process.exit(1);
  }
}

bootstrap();
