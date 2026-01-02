import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { signOutAction } from "@/lib/auth/actions";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Settings</h1>
        <p className="mt-1 text-sm text-zinc-600">Manage your account session.</p>
      </div>
      <Card className="p-6">
        <p className="text-sm text-zinc-600">
          Sign out of your account on this device.
        </p>
        <form action={signOutAction} className="mt-4">
          <Button type="submit">Sign out</Button>
        </form>
      </Card>
    </div>
  );
}
