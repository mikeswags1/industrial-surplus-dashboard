const FOOTER_TEXT =
  "Not a fit? Unsubscribe here:";

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildUnsubscribeUrl(
  request: Request,
  input: { leadId?: string | null; email?: string | null }
): string {
  const origin = new URL(request.url).origin;
  const url = new URL("/api/unsubscribe", origin);
  if (input.leadId?.trim()) url.searchParams.set("lead", input.leadId.trim());
  if (input.email?.trim()) url.searchParams.set("email", input.email.trim().toLowerCase());
  return url.toString();
}

export function appendUnsubscribeText(text: string, unsubscribeUrl: string): string {
  return `${text.replace(/\s+$/, "")}\n\n${FOOTER_TEXT} ${unsubscribeUrl}`;
}

export function appendUnsubscribeHtml(html: string, unsubscribeUrl: string): string {
  const safeUrl = escapeHtml(unsubscribeUrl);
  return `${html}<p style="margin-top:18px;color:#666;font-size:12px;line-height:1.5">${FOOTER_TEXT} <a href="${safeUrl}">${safeUrl}</a></p>`;
}

export function unsubscribeHeaders(unsubscribeUrl: string): Record<string, string> {
  return {
    "List-Unsubscribe": `<${unsubscribeUrl}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}
