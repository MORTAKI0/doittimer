import { getActiveSession, getTodaySessions } from "@/app/actions/sessions";
import { Card } from "@/components/ui/card";
import { FocusPanel } from "./FocusPanel";

export default async function FocusPage() {
  const [activeResult, todayResult] = await Promise.all([
    getActiveSession(),
    getTodaySessions(),
  ]);

  const activeSession = activeResult.success ? activeResult.data : null;
  const todaySessions = todayResult.success ? todayResult.data : [];
  const errorMessage =
    !activeResult.success ? activeResult.error : !todayResult.success ? todayResult.error : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Focus</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Lance une session pour mesurer ton temps de concentration.
        </p>
      </div>

      {errorMessage ? (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_1fr]">
        <Card>
          <FocusPanel activeSession={activeSession} todaySessions={todaySessions} />
        </Card>
      </div>
    </div>
  );
}
