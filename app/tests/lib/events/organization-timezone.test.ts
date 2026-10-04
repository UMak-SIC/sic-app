import { afterEach, expect, test, vi } from "vitest";

import {
  formatOrganizationDate,
  getOrganizationTimezone,
} from "@/lib/events/organization-timezone";

afterEach(() => {
  vi.unstubAllEnvs();
});

test("uses the configured IANA timezone", () => {
  vi.stubEnv("ORGANIZATION_TIMEZONE", "Asia/Manila");

  expect(getOrganizationTimezone()).toBe("Asia/Manila");
  expect(formatOrganizationDate(new Date("2026-01-01T00:00:00.000Z"))).toContain("8:00 AM");
});

test("rejects missing and invalid organization timezones", () => {
  vi.stubEnv("ORGANIZATION_TIMEZONE", "");
  expect(() => getOrganizationTimezone()).toThrow("ORGANIZATION_TIMEZONE is required.");

  vi.stubEnv("ORGANIZATION_TIMEZONE", "not/a-timezone");
  expect(() => getOrganizationTimezone()).toThrow("valid IANA timezone");
});
