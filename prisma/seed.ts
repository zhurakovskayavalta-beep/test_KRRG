import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DOCUMENT_TYPES = [
  // Договоры
  { code: "CONTRACT", name: "Договор", category: "contract", sortOrder: 10 },
  { code: "ADDENDUM", name: "Дополнительное соглашение", category: "contract", sortOrder: 11 },
  { code: "APPENDIX", name: "Приложение к договору", category: "contract", sortOrder: 12 },
  // Спецификация
  { code: "SPECIFICATION", name: "Спецификация", category: "specification", sortOrder: 20 },
  // Отгрузочные документы
  { code: "TN", name: "Товарная накладная (ТН)", category: "shipping", sortOrder: 30 },
  { code: "TTH", name: "Товарно-транспортная накладная (ТТН)", category: "shipping", sortOrder: 31 },
  { code: "CMR", name: "Международная транспортная накладная (CMR)", category: "shipping", sortOrder: 32 },
  { code: "PACKING_LIST", name: "Упаковочный лист", category: "shipping", sortOrder: 33 },
  // Прочее
  { code: "INVOICE", name: "Инвойс", category: "shipping", sortOrder: 40 },
  { code: "CERTIFICATE", name: "Сертификат соответствия", category: "other", sortOrder: 50 },
  { code: "LABEL", name: "Вшивная бирка", category: "label", sortOrder: 60 },
  { code: "OTHER", name: "Прочее", category: "other", sortOrder: 99 },
];

async function seedAdminUser() {
  const adminEmail = "admin@erp.local";
  const adminPassword = "admin123";

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
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

async function seedDocumentTypes() {
  let created = 0;
  for (const type of DOCUMENT_TYPES) {
    const existing = await prisma.documentType.findUnique({ where: { code: type.code } });
    if (existing) continue;
    await prisma.documentType.create({ data: type });
    created++;
  }
  if (created > 0) {
    console.log(`✓ Создано типов документов: ${created}`);
  } else {
    console.log("✓ Типы документов уже инициализированы");
  }
}

async function main() {
  await seedAdminUser();
  await seedDocumentTypes();
}

main()
  .catch((error) => {
    console.error("Ошибка при заполнении БД:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
