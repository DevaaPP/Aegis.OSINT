import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create Default Admin User
  const adminEmail = 'admin@privacy.org';
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash('AdminSecurePass2026!', 10);
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'Super Admin',
        passwordHash,
        role: Role.ADMIN,
      },
    });
    console.log(`Admin user created: ${admin.email}`);
  } else {
    console.log('Admin user already exists.');
  }

  // Create Default User for Testing
  const testEmail = 'user@privacy.org';
  const existingUser = await prisma.user.findUnique({
    where: { email: testEmail },
  });

  if (!existingUser) {
    const passwordHash = await bcrypt.hash('UserSecurePass2026!', 10);
    const user = await prisma.user.create({
      data: {
        email: testEmail,
        name: 'John Doe',
        passwordHash,
        role: Role.USER,
      },
    });
    console.log(`Test user created: ${user.email}`);
  } else {
    console.log('Test user already exists.');
  }

  console.log('Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
