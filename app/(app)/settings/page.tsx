import { getNotionConnection } from "@/app/actions/notion";
import { getUserSettings } from "@/app/actions/settings";
import { getTasks } from "@/app/actions/tasks";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { signOutAction } from "@/lib/auth/actions";
import { getUser } from "@/lib/auth/get-user";
import { DataManagementCard } from "./DataManagementCard";
import { NotionIntegrationCard } from "./NotionIntegrationCard";
import { SettingsForm } from "./SettingsForm";

export default async function SettingsPage() {
  const user = await getUser();
  const email = user?.email ?? "Unknown";
  const [settingsResult, tasksResult] = await Promise.all([getUserSettings(), getTasks()]);
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

  const tasks = tasksResult.success ? tasksResult.data.tasks.map((t) => ({ id: t.id, title: t.title })) : [];
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
    <div className="space-y-8">
      <div className="animate-fadeInUp space-y-1">
        <p className="text-overline">Workspace</p>
        <h1 className="text-page-title text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your account, preferences, and integrations.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card variant="accent" className="animate-fadeInUp stagger-1 space-y-3 p-6">
          <p className="text-overline">Profile</p>
          <div className="flex items-center gap-4 rounded-xl bg-muted/30 p-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-lg font-bold text-emerald-800">
              {email ? email.slice(0, 2).toUpperCase() : "U"}
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">{email ?? "Unknown"}</p>
              <p className="text-xs text-muted-foreground">Signed in</p>
            </div>
          </div>
          <form action={signOutAction} className="pt-2">
            <Button type="submit" variant="secondary">Sign out</Button>
          </form>
        </Card>

        <Card className="animate-fadeInUp stagger-2 space-y-3 p-6">
          <p className="text-overline">Theme</p>
          <p className="text-sm text-muted-foreground">Theme can be toggled in the app navigation. Preference is saved per session cookie.</p>
        </Card>
      </div>

      <Card className="animate-fadeInUp stagger-3 space-y-4 p-6">
        <div>
          <p className="text-overline">Focus Defaults</p>
          <p className="mt-2 text-sm text-muted-foreground">Auto-save is enabled. You can also click Save now as fallback.</p>
        </div>
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
      </Card>

      <div className="animate-fadeInUp stagger-4">
        <DataManagementCard />
      </div>
      <div className="animate-fadeInUp stagger-5">
        <NotionIntegrationCard initialConnection={notionConnection} initialError={notionError} />
      </div>
    </div>
  );
}
