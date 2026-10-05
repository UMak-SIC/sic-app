import { afterEach, describe, expect, it, vi } from "vitest";

import { sendTestEmail } from "@/lib/email/send-test-email";

describe("sendTestEmail", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts the rendered practice email to the protected test-send route", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ sent: true }));
    vi.stubGlobal("fetch", fetchMock);

    await sendTestEmail({
      to: "admin@umak.edu.ph",
      subject: "Event reminder",
      markdown: "Hello Andrea",
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/campaigns/test-send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: "admin@umak.edu.ph",
        subject: "Event reminder",
        markdown: "Hello Andrea",
      }),
    });
  });

  it("can request a non-functional practice pass image", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ sent: true }));
    vi.stubGlobal("fetch", fetchMock);

    await sendTestEmail({
      to: "admin@umak.edu.ph",
      subject: "Event reminder",
      markdown: "Hello Andrea",
      includePracticePass: true,
    });

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ includePracticePass: true });
  });

  it("surfaces the server's plain-language error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(
      { error: "The email could not be sent." },
      { status: 502 },
    )));

    await expect(sendTestEmail({ to: "admin@umak.edu.ph", subject: "Test", markdown: "Hi" }))
      .rejects.toThrow("The email could not be sent.");
  });
});
