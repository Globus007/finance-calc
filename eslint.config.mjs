import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { version as reactVersion } from "react";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Explicit version avoids eslint-plugin-react's "detect" path, which still
  // calls context.getFilename() and breaks under ESLint 10.
  {
    settings: {
      react: {
        version: reactVersion,
      },
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "prototype-screen-map/**",
  ]),
]);

export default eslintConfig;
