import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = "admin@erp.local";
  const adminPassword = "admin123";

  const existing = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existing) {
    console.log(`✓ Администратор уже существует: ${adminEmail}`);
    return;
  }

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await prisma.user.create({
    data: {
      email: adminEmail,
      passwordHash,
      fullName: "Администратор",
      role: UserRole.ADMIN,
      isActive: true,
    },
  });

  console.log("─".repeat(60));
  console.log("✓ Создан пользователь-администратор");
  console.log(`  Email:  ${adminEmail}`);
  console.log(`  Пароль: ${adminPassword}`);
  console.log("⚠  Обязательно смените пароль после первого входа.");
  console.log("─".repeat(60));
}

main()
  .catch((error) => {
    console.error("Ошибка при заполнении БД:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
