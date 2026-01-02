import { Card } from "@/components/ui/card";

export default function FocusLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-6 w-32 rounded bg-zinc-100" />
        <div className="h-4 w-64 rounded bg-zinc-100" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_1fr]">
        <Card className="space-y-4">
          <div className="h-4 w-24 rounded bg-zinc-100" />
          <div className="h-10 w-24 rounded bg-zinc-100" />
          <div className="h-10 w-full rounded bg-zinc-100" />
          <div className="h-10 w-full rounded bg-zinc-100" />
        </Card>
      </div>
    </div>
  );
}
