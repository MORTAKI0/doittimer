import { Skeleton } from "@/components/ui/skeleton";

export default function LoadingDashboardPage() {
  return (
    <div className="space-y-8">
      <div className="dashboard-topbar-shell dashboard-topbar-shell-loading">
        <Skeleton className="h-12 flex-1 rounded-[0.875rem]" />
        <div className="dashboard-topbar-actions">
          <Skeleton className="h-10 w-24 rounded-full" />
          <Skeleton className="h-10 w-10 rounded-[0.875rem]" />
          <Skeleton className="h-10 w-10 rounded-[0.875rem]" />
          <Skeleton className="h-10 w-10 rounded-[0.875rem]" />
        </div>
      </div>
      <div className="space-y-3">
        <Skeleton className="h-12 w-80 max-w-full" />
        <Skeleton className="h-5 w-72 max-w-full" />
      </div>
      <div className="dashboard-bento-grid">
        <Skeleton className="col-span-12 h-[34rem] rounded-[2rem] lg:col-span-8" />
        <Skeleton className="col-span-12 h-[22rem] rounded-[2rem] lg:col-span-4" />
        <Skeleton className="col-span-12 h-[28rem] rounded-[2rem] lg:col-span-7" />
        <Skeleton className="col-span-12 h-[28rem] rounded-[2rem] lg:col-span-5" />
      </div>
      <Skeleton className="h-24 w-full max-w-[32rem] rounded-[1.5rem]" />
    </div>
  );
}

