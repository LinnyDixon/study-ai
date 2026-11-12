export function safeRedirectPath(value: string | string[] | undefined, fallback = "/") {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  return value;
}
