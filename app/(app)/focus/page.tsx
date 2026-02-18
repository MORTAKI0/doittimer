import { getTaskQueue } from "@/app/actions/queue";
import {
  getActiveSessionDetails,
  getSessionTotalByDay,
  getSessionsByDay,
} from "@/app/actions/sessions";
import { getUserSettings } from "@/app/actions/settings";
import { getTasks } from "@/app/actions/tasks";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getUser } from "@/lib/auth/get-user";
import { FocusPanel } from "./FocusPanel";
import { FocusRealtimeSync } from "./FocusRealtimeSync";

const ERROR_MAP: Record<string, string> = {
  "Tu dois etre connecte.": "You must be signed in.",
  "Impossible de charger la session active.":
    "Unable to load the active session.",
  "Impossible de charger les sessions du jour.":
    "Unable to load today's sessions.",
  "Impossible de charger les sessions.":
    "Unable to load sessions.",
  "Impossible de charger le total des sessions.":
    "Unable to load session total.",
  "Impossible de charger les taches.": "Unable to load tasks.",
  "Erreur reseau. Verifie ta connexion et reessaie.":
    "Network error. Check your connection and try again.",
};

function toEnglishError(message: string | null) {
  if (!message) return null;
  return ERROR_MAP[message] ?? message;
}

function isValidDateOnly(value: string | undefined): value is string {
  if (!value) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime());
}

function todayDateOnly() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

type FocusPageProps = {
  searchParams: Promise<{ day?: string }>;
};

export default async function FocusPage(props: FocusPageProps) {
  const searchParams = await props.searchParams;
  const selectedDay = isValidDateOnly(searchParams.day)
    ? searchParams.day
    : todayDateOnly();
  const user = await getUser();
  const [activeResult, sessionsResult, sessionTotalResult, tasksResult, settingsResult, queueResult] =
    await Promise.all([
      getActiveSessionDetails(),
      getSessionsByDay(selectedDay),
      getSessionTotalByDay(selectedDay),
      getTasks({ limit: 200, status: "active" }),
      getUserSettings(),
      getTaskQueue(),
    ]);

  const activeSession = activeResult.success ? activeResult.data : null;
  const daySessions = sessionsResult.success ? sessionsResult.data : [];
  const daySessionsTotalSeconds = sessionTotalResult.success
    ? sessionTotalResult.data.total_seconds
    : 0;
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
      count: daySessions.length,
      first: daySessions[0]
        ? {
          id: daySessions[0].id,
          started_at: daySessions[0].started_at,
          ended_at: daySessions[0].ended_at,
          duration_seconds: daySessions[0].duration_seconds,
          edited_at: daySessions[0].edited_at,
          edit_reason: daySessions[0].edit_reason,
        }
        : null,
    });
  }

  const errorMessage = !activeResult.success
    ? toEnglishError(activeResult.error)
    : !sessionsResult.success
      ? toEnglishError(sessionsResult.error)
      : !sessionTotalResult.success
        ? toEnglishError(sessionTotalResult.error)
      : !tasksResult.success
        ? toEnglishError(tasksResult.error)
        : null;

  return (
    <div className="space-y-6">
      <FocusRealtimeSync userId={user?.id ?? null} />
      <div className="animate-fadeInUp space-y-1">
        <p className="text-overline">Deep work</p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-page-title text-foreground">Focus</h1>
          <span className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-muted/50 px-2 py-1 text-[10px] font-medium text-muted-foreground">
            Space to start/stop
          </span>
        </div>
        <p className="text-muted-foreground text-sm">
          Start a session, track Pomodoro phases, and keep momentum visible.
        </p>
      </div>

      {errorMessage ? (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}

      <Card className="animate-fadeInUp stagger-2 space-y-3">
        <CardHeader>
          <CardTitle>Session controls</CardTitle>
          <CardDescription>
            Primary actions are optimized for keyboard and mobile. Press Space
            to start/stop.
          </CardDescription>
        </CardHeader>
        <FocusPanel
          activeSession={activeSession}
          todaySessions={daySessions}
          selectedDay={selectedDay}
          totalFocusedSeconds={daySessionsTotalSeconds}
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
