/** Builds auth return URLs for the configured public app, falling back to the current origin locally. */
export function getAuthCallbackUrl(nextPath: string): string {
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  const siteUrl = configuredSiteUrl || window.location.origin;

  return `${siteUrl}/auth/callback?next=${encodeURIComponent(nextPath)}`;
}
