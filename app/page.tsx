import { redirect } from "next/navigation";

import { MarketingLanding } from "@/components/marketing/MarketingLanding";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  if (data.user) {
    redirect("/dashboard");
  }

  return <MarketingLanding />;
}
