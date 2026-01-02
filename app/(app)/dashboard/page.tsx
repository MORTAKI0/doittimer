import { Card } from "@/components/ui/card";
import { getUser } from "@/lib/auth/get-user";

export default async function DashboardPage() {
  const user = await getUser();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-600">You are signed in.</p>
      </div>
      <Card className="p-6">
        <p className="text-sm text-zinc-600">Session active.</p>
        {user?.email ? (
          <p className="mt-2 text-xs text-zinc-500">{user.email}</p>
        ) : null}
      </Card>
    </div>
  );
}
