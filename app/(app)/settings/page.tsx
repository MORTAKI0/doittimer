import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getUserSettings } from "@/app/actions/settings";
import { signOutAction } from "@/lib/auth/actions";
import { getUser } from "@/lib/auth/get-user";
import { getTasks } from "@/app/actions/tasks";
import { getNotionConnection } from "@/app/actions/notion";
import { SettingsForm } from "./SettingsForm";
import { NotionIntegrationCard } from "./NotionIntegrationCard";
import { DataManagementCard } from "./DataManagementCard";

export default async function SettingsPage() {
  const user = await getUser();
  const email = user?.email ?? "Unknown";
  const [settingsResult, tasksResult] = await Promise.all([
    getUserSettings(),
    getTasks(),
  ]);
  const notionResult = await getNotionConnection();
  const settings = settingsResult.success
    ? settingsResult.data
    : {
      timezone: "Africa/Casablanca",
      default_task_id: null,
      pomodoro_work_minutes: 25,
      pomodoro_short_break_minutes: 5,
      pomodoro_long_break_minutes: 15,
      pomodoro_long_break_every: 4,
      pomodoro_v2_enabled: false,
      auto_archive_completed: false,
    };
  const settingsError = settingsResult.success ? null : settingsResult.error;
  const tasks = tasksResult.success
    ? tasksResult.data.tasks.map((t) => ({ id: t.id, title: t.title }))
    : [];
  const notionConnection = notionResult.success
    ? notionResult.data
    : {
      connected: false,
      last_synced_at: null,
      last_status: null,
      last_error: null,
    };
  const notionError = notionResult.success ? null : notionResult.error;

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
      <Card className="p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Focus defaults
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Set your timezone and default task for new focus sessions.
        </p>
        {settingsError ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {settingsError}
          </p>
        ) : null}
        <div className="mt-4">
          <SettingsForm
            initialTimezone={settings.timezone}
            initialDefaultTaskId={settings.default_task_id}
            initialPomodoroWorkMinutes={settings.pomodoro_work_minutes}
            initialPomodoroShortBreakMinutes={settings.pomodoro_short_break_minutes}
            initialPomodoroLongBreakMinutes={settings.pomodoro_long_break_minutes}
            initialPomodoroLongBreakEvery={settings.pomodoro_long_break_every}
            initialAutoArchiveCompleted={settings.auto_archive_completed}
            tasks={tasks}
          />
        </div>
      </Card>
      <DataManagementCard />
      <NotionIntegrationCard
        initialConnection={notionConnection}
        initialError={notionError}
      />
    </div>
  );
}
