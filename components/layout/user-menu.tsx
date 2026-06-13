import { LogOut } from "lucide-react";

import { auth } from "@/lib/auth";
import { logoutAction } from "@/modules/auth/actions";
import { ROLE_LABELS } from "@/lib/permissions";
import { Button } from "@/components/ui/button";

export async function UserMenu() {
  const session = await auth();
  if (!session?.user) return null;

  return (
    <div className="flex items-center gap-4">
      <div className="text-right">
        <div className="text-sm font-medium">{session.user.fullName}</div>
        <div className="text-xs text-muted-foreground">
          {ROLE_LABELS[session.user.role]}
        </div>
      </div>
      <form action={logoutAction}>
        <Button type="submit" variant="ghost" size="icon" title="Выйти">
          <LogOut className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
