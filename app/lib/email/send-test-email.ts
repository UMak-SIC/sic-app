export type TestEmailRequest = {
  to: string;
  subject: string;
  markdown: string;
  includePracticePass?: boolean;
};

type TestEmailResponse = {
  error?: string;
};

export async function sendTestEmail(request: TestEmailRequest): Promise<void> {
  const response = await fetch("/api/campaigns/test-send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  const body = await response.json().catch(() => null) as TestEmailResponse | null;

  if (!response.ok) {
    throw new Error(body?.error ?? "We could not send the practice email. Please try again.");
  }
}
