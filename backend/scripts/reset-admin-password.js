import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/services/passwords.js';
import { readHidden } from './hidden-input.js';

const prisma = new PrismaClient();
const email = process.argv[2]?.trim().toLowerCase();

if (!email) {
  console.error('Usage: npm run admin:reset-password -- admin@example.com');
  process.exit(1);
}

try {
  const password = await readHidden('New administrator password (12+ characters): ');
  const confirmation = await readHidden('Confirm password: ');
  if (password.length < 12 || password !== confirmation) {
    throw new Error('Passwords must match and be at least 12 characters long.');
  }

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true } });
  if (!user || !['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
    throw new Error('No administrator with that email was found.');
  }

  const passwordHash = await hashPassword(password);
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
    prisma.session.deleteMany({ where: { userId: user.id } }),
    prisma.auditLog.create({ data: { actorId: user.id, action: 'admin.password_reset', targetType: 'User', targetId: String(user.id) } }),
  ]);
  console.log(`Updated password and signed out all sessions for ${email}.`);
} catch (error) {
  console.error('Could not reset password:', error.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
