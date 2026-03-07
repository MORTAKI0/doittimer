import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function LoadingDashboardPage() {
  return (
    <div className="space-y-8">
      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.75fr)_400px] xl:grid-cols-[minmax(0,1.55fr)_380px]">
        <Card variant="accent" className="space-y-5">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-10 w-56" />
          <Skeleton className="h-5 w-full max-w-xl" />
          <div className="grid gap-3 sm:grid-cols-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </Card>

        <Card className="space-y-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-52" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-28 w-full" />
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr_1fr]">
        <Skeleton className="h-36 w-full rounded-[1.5rem]" />
        <Skeleton className="h-36 w-full rounded-[1.5rem]" />
        <Skeleton className="h-36 w-full rounded-[1.5rem]" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-4">
        <Skeleton className="h-40 w-full rounded-[1.5rem]" />
        <Skeleton className="h-40 w-full rounded-[1.5rem]" />
        <Skeleton className="h-40 w-full rounded-[1.5rem]" />
        <Skeleton className="h-40 w-full rounded-[1.5rem]" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(340px,0.9fr)] 2xl:grid-cols-[minmax(0,1.85fr)_380px]">
        <Skeleton className="h-[29rem] w-full rounded-[1.75rem]" />
        <Skeleton className="h-[29rem] w-full rounded-[1.75rem]" />
      </div>

      <div className="grid gap-4 2xl:grid-cols-3 xl:grid-cols-2">
        <Skeleton className="h-44 w-full rounded-[1.5rem]" />
        <Skeleton className="h-44 w-full rounded-[1.5rem]" />
        <Skeleton className="h-44 w-full rounded-[1.5rem]" />
      </div>

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-8 w-28" />
        </div>
        <div className="grid gap-4 2xl:grid-cols-3 xl:grid-cols-2">
          <Skeleton className="h-64 w-full rounded-[1.5rem]" />
          <Skeleton className="h-64 w-full rounded-[1.5rem]" />
          <Skeleton className="h-64 w-full rounded-[1.5rem]" />
        </div>
      </Card>
    </div>
  );
}

