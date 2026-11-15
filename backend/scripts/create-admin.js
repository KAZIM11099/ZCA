import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/services/passwords.js';
import { readHidden } from './hidden-input.js';

const prisma = new PrismaClient();
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const fullName = process.env.ADMIN_NAME?.trim();

if (!email || !fullName) {
  console.error('Set ADMIN_EMAIL and ADMIN_NAME before running this script.');
  process.exit(1);
}

try {
  const password = await readHidden('New administrator password (12+ characters): ');
  const confirmation = await readHidden('Confirm password: ');
  if (password.length < 12 || password !== confirmation) {
    throw new Error('Passwords must match and be at least 12 characters long.');
  }
  const passwordHash = await hashPassword(password);
  const admin = await prisma.user.create({
    data: { email, fullName, passwordHash, role: 'SUPER_ADMIN' },
    select: { id: true, email: true, role: true },
  });
  console.log(`Created ${admin.role} account ${admin.email} (id ${admin.id}).`);
} catch (error) {
  console.error('Could not create admin account:', error.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
