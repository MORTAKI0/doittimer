import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const outputFile = path.join(rootDir, "app", "font-sans.generated.ts");
const sfDir = path.join(rootDir, "public", "fonts", "sf-pro");

const requiredFonts = [
  "SF-Pro-Text-Regular.woff2",
  "SF-Pro-Text-Medium.woff2",
  "SF-Pro-Text-Semibold.woff2",
  "SF-Pro-Display-Bold.woff2",
];

const enableFlag = process.env.DOITTIMER_ENABLE_SF_PRO === "1";
const hasAllFonts = requiredFonts.every((file) =>
  fs.existsSync(path.join(sfDir, file)),
);
const useSfPro = enableFlag && hasAllFonts;

const fallbackModule = `export const sansFont = {
  className: "",
  variable: "",
} as const;

export const fontStrategy = "system" as const;
`;

const sfProModule = `import localFont from "next/font/local";

export const sansFont = localFont({
  variable: "--font-sans",
  display: "swap",
  src: [
    {
      path: "../public/fonts/sf-pro/SF-Pro-Text-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/sf-pro/SF-Pro-Text-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/fonts/sf-pro/SF-Pro-Text-Semibold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../public/fonts/sf-pro/SF-Pro-Display-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  fallback: [
    "system-ui",
    "-apple-system",
    "BlinkMacSystemFont",
    "Segoe UI",
    "Roboto",
    "Arial",
    "sans-serif",
  ],
});

export const fontStrategy = "sf-pro" as const;
`;

fs.writeFileSync(outputFile, useSfPro ? sfProModule : fallbackModule, "utf8");
