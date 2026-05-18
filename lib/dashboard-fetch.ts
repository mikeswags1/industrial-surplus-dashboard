/**
 * Same-origin API calls with cookies + redirect to /access when the site PIN session is missing.
 */

export async function dashboardFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const res = await fetch(input, {
    ...init,
    credentials: "include",
  });
  if (res.status !== 401) return res;
  let j: { code?: string } = {};
  try {
    j = (await res.clone().json()) as { code?: string };
  } catch {
    return res;
  }
  if (j.code === "SITE_ACCESS_REQUIRED" && typeof window !== "undefined") {
    window.location.assign(
      `/access?next=${encodeURIComponent(window.location.pathname + window.location.search)}`
    );
  }
  return res;
}
