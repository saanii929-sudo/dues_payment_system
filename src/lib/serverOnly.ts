if (typeof window !== "undefined") {
  throw new Error(
    "This module is server-only and must not be imported into client-bundled code.",
  );
}
