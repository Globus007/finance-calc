/**
 * TypeScript 7 has no compiler API. Tools that still need it (typescript-eslint)
 * must resolve `typescript` to the TS 6 API package. See:
 * https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#running-side-by-side-with-typescript-6.0
 */
function readPackage(pkg) {
  const needsTs6Api =
    pkg.name === "typescript-eslint" ||
    (typeof pkg.name === "string" && pkg.name.startsWith("@typescript-eslint/"));

  if (needsTs6Api) {
    pkg.dependencies = {
      ...pkg.dependencies,
      typescript: "npm:@typescript/typescript6@6.0.2",
    };
    if (pkg.peerDependencies?.typescript) {
      delete pkg.peerDependencies.typescript;
    }
  }

  return pkg;
}

module.exports = {
  hooks: {
    readPackage,
  },
};
