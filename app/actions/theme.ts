"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

export type Theme = "light" | "dark" | "system";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export async function setThemeAction(theme: Theme) {
  const isProd = process.env.NODE_ENV === "production";
  const value = theme === "dark" || theme === "system" ? theme : "light";
  const cookieStore = await cookies();

  cookieStore.set("theme", value, {
    path: "/",
    sameSite: "lax",
    secure: isProd,
    maxAge: ONE_YEAR_SECONDS,
  });

  revalidatePath("/", "layout");
}

export async function getTheme(): Promise<Theme> {
  const cookieStore = await cookies();
  const theme = cookieStore.get("theme")?.value;

  if (theme === "dark" || theme === "light" || theme === "system") {
    return theme;
  }

  return "light";
}
