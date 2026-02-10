import { getTaskQueue } from "@/app/actions/queue";
import {
  getActiveSessionDetails,
  getTodaySessions,
} from "@/app/actions/sessions";
import { getUserSettings } from "@/app/actions/settings";
import { getTasks } from "@/app/actions/tasks";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FocusPanel } from "./FocusPanel";

const ERROR_MAP: Record<string, string> = {
  "Tu dois etre connecte.": "You must be signed in.",
  "Impossible de charger la session active.":
    "Unable to load the active session.",
  "Impossible de charger les sessions du jour.":
    "Unable to load today's sessions.",
  "Impossible de charger les taches.": "Unable to load tasks.",
  "Erreur reseau. Verifie ta connexion et reessaie.":
    "Network error. Check your connection and try again.",
};

function toEnglishError(message: string | null) {
  if (!message) return null;
  return ERROR_MAP[message] ?? message;
}

export default async function FocusPage() {
  const [activeResult, todayResult, tasksResult, settingsResult, queueResult] =
    await Promise.all([
      getActiveSessionDetails(),
      getTodaySessions(),
      getTasks({ limit: 200 }),
      getUserSettings(),
      getTaskQueue(),
    ]);

  const activeSession = activeResult.success ? activeResult.data : null;
  const todaySessions = todayResult.success ? todayResult.data : [];
  const tasks = tasksResult.success ? tasksResult.data.tasks : [];
  const defaultTaskId = settingsResult.success
    ? settingsResult.data.default_task_id
    : null;
  const pomodoroDefaults = settingsResult.success
    ? {
        workMinutes: settingsResult.data.pomodoro_work_minutes,
        shortBreakMinutes: settingsResult.data.pomodoro_short_break_minutes,
        longBreakMinutes: settingsResult.data.pomodoro_long_break_minutes,
        longBreakEvery: settingsResult.data.pomodoro_long_break_every,
      }
    : {
        workMinutes: 25,
        shortBreakMinutes: 5,
        longBreakMinutes: 15,
        longBreakEvery: 4,
      };
  const pomodoroEnabled = settingsResult.success
    ? settingsResult.data.pomodoro_v2_enabled
    : false;
  const queueItems = queueResult.success ? queueResult.data : [];

  if (process.env.NODE_ENV !== "production") {
    console.debug("[focus.page] todaySessions shape", {
      count: todaySessions.length,
      first: todaySessions[0]
        ? {
            id: todaySessions[0].id,
            started_at: todaySessions[0].started_at,
            ended_at: todaySessions[0].ended_at,
            duration_seconds: todaySessions[0].duration_seconds,
            edited_at: todaySessions[0].edited_at,
            edit_reason: todaySessions[0].edit_reason,
          }
        : null,
    });
  }

  const errorMessage = !activeResult.success
    ? toEnglishError(activeResult.error)
    : !todayResult.success
      ? toEnglishError(todayResult.error)
      : !tasksResult.success
        ? toEnglishError(tasksResult.error)
        : null;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-overline">Deep work</p>
        <h1 className="text-page-title text-foreground">Focus</h1>
        <p className="text-muted-foreground text-sm">
          Start a session, track Pomodoro phases, and keep momentum visible.
        </p>
      </div>

      {errorMessage ? (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}

      <Card className="space-y-3">
        <CardHeader>
          <CardTitle>Session controls</CardTitle>
          <CardDescription>
            Primary actions are optimized for keyboard and mobile. Press Space
            to start/stop.
          </CardDescription>
        </CardHeader>
        <FocusPanel
          activeSession={activeSession}
          todaySessions={todaySessions}
          tasks={tasks}
          defaultTaskId={defaultTaskId}
          pomodoroDefaults={pomodoroDefaults}
          pomodoroEnabled={pomodoroEnabled}
          queueItems={queueItems}
        />
      </Card>
    </div>
  );
}
