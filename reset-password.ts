import prisma from './src/lib/prisma';
import crypto from "crypto";

// The project's hashing function (copied from src/lib/auth.ts)
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex")
  const iterations = 210000
  const hash = crypto.pbkdf2Sync(password, salt, iterations, 64, "sha512").toString("hex")
  return `${iterations}:${salt}:${hash}`
}

async function main() {
  const newPassword = 'SuperAdmin@123';
  const newPasswordHash = hashPassword(newPassword);
  
  const updatedUser = await prisma.user.update({
    where: { email: 'superadmin@bosq.ae' },
    data: { password: newPasswordHash },
  });
  
  console.log('Password reset successfully for:', updatedUser.email);
  console.log('Your new password is:', newPassword);
  console.log('You can change it inside this script if you want a different one, then run it again.');
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
