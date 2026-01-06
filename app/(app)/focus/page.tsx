import { getActiveSession, getTodaySessions } from "@/app/actions/sessions";
import { getUserSettings } from "@/app/actions/settings";
import { getTasks } from "@/app/actions/tasks";
import { Card } from "@/components/ui/card";
import { FocusPanel } from "./FocusPanel";

const ERROR_MAP: Record<string, string> = {
  "Tu dois etre connecte.": "You must be signed in.",
  "Impossible de charger la session active.": "Unable to load the active session.",
  "Impossible de charger les sessions du jour.": "Unable to load today's sessions.",
  "Impossible de charger les taches.": "Unable to load tasks.",
  "Erreur reseau. Verifie ta connexion et reessaie.": "Network error. Check your connection and try again.",
};

function toEnglishError(message: string | null) {
  if (!message) return null;
  return ERROR_MAP[message] ?? message;
}

export default async function FocusPage() {
  const [activeResult, todayResult, tasksResult, settingsResult] = await Promise.all([
    getActiveSession(),
    getTodaySessions(),
    getTasks(),
    getUserSettings(),
  ]);

  const activeSession = activeResult.success ? activeResult.data : null;
  const todaySessions = todayResult.success ? todayResult.data : [];
  const tasks = tasksResult.success ? tasksResult.data : [];
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
  const errorMessage =
    !activeResult.success
      ? toEnglishError(activeResult.error)
      : !todayResult.success
        ? toEnglishError(todayResult.error)
        : !tasksResult.success
          ? toEnglishError(tasksResult.error)
          : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Focus</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Start a session to track your focused time.
        </p>
      </div>

      {errorMessage ? (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_1fr]">
        <Card>
          <FocusPanel
            activeSession={activeSession}
            todaySessions={todaySessions}
            tasks={tasks}
            defaultTaskId={defaultTaskId}
            pomodoroDefaults={pomodoroDefaults}
          />
        </Card>
      </div>
    </div>
  );
}
