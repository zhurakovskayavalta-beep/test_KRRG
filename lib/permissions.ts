import { UserRole } from "@prisma/client";

/**
 * Локализованные названия ролей для UI.
 */
export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Администратор",
  MANAGER: "Менеджер",
  ACCOUNTANT: "Бухгалтер",
  LOGISTICS: "Логист",
  VIEWER: "Наблюдатель",
};

/**
 * Описание ролей.
 */
export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  ADMIN: "Полный доступ ко всем функциям системы",
  MANAGER: "Управление заказами, клиентами и фабриками",
  ACCOUNTANT: "Финансовые расчёты, документы, платежи",
  LOGISTICS: "Заказы, документы, логистика",
  VIEWER: "Только просмотр",
};

/**
 * Базовая проверка доступа на уровне роли.
 *
 * В Фазе 2+ заменим на гранулярную проверку прав через таблицу Permissions.
 */
export function hasRole(userRole: UserRole | undefined, allowed: UserRole[]): boolean {
  if (!userRole) return false;
  return allowed.includes(userRole);
}

export const ROLE_GROUPS = {
  ALL: Object.values(UserRole) as UserRole[],
  ADMIN_ONLY: [UserRole.ADMIN] as UserRole[],
  MANAGEMENT: [UserRole.ADMIN, UserRole.MANAGER] as UserRole[],
  FINANCE: [UserRole.ADMIN, UserRole.ACCOUNTANT] as UserRole[],
  OPERATIONS: [UserRole.ADMIN, UserRole.MANAGER, UserRole.LOGISTICS] as UserRole[],
} as const;
