import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { signOutAction } from "@/lib/auth/actions";
import { getUser } from "@/lib/auth/get-user";

export default async function SettingsPage() {
  const user = await getUser();
  const email = user?.email ?? "Unknown";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account and session.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card className="p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Account
          </p>
          <p className="mt-2 text-sm text-muted-foreground">Signed in as</p>
          <p className="mt-1 text-base font-semibold text-foreground">{email}</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">
            Sign out of your account on this device.
          </p>
          <form action={signOutAction} className="mt-4">
            <Button type="submit">Sign out</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
