import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const requireAdmin = vi.hoisted(() => vi.fn());
const searchGlobalAttendees = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/require-admin", () => ({
  requireAdmin: () => requireAdmin(),
}));

vi.mock("@/lib/services/attendee-directory-service", () => ({
  DEFAULT_PAGE_SIZE: 25,
  MAX_PAGE_SIZE: 100,
}));

vi.mock("@/lib/services/attendee-search-service", () => ({
  searchGlobalAttendees: (input: unknown) => searchGlobalAttendees(input),
}));

import { GET } from "@/app/api/attendees/route";

function get(query = "") {
  return new Request(`http://localhost/api/attendees${query}`);
}

beforeEach(() => {
  vi.clearAllMocks();
  requireAdmin.mockResolvedValue({ adminId: "admin-1" });
  process.env.ORGANIZATION_TIMEZONE = "Asia/Manila";
  searchGlobalAttendees.mockResolvedValue({
    attendees: [],
    pagination: { page: 1, pageSize: 25, total: 0, totalPages: 1 },
  });
});

afterEach(() => {
  vi.resetAllMocks();
  delete process.env.ORGANIZATION_TIMEZONE;
});

describe("GET /api/attendees", () => {
  it("refuses an unauthenticated caller", async () => {
    requireAdmin.mockResolvedValue(Response.json({ error: "Unauthorized" }, { status: 401 }));

    const res = await GET(get());

    expect(res.status).toBe(401);
    expect(searchGlobalAttendees).not.toHaveBeenCalled();
  });

  it("refuses a signed-in user who is not an administrator", async () => {
    requireAdmin.mockResolvedValue(Response.json({ error: "Forbidden" }, { status: 403 }));

    const res = await GET(get());

    expect(res.status).toBe(403);
    expect(searchGlobalAttendees).not.toHaveBeenCalled();
  });

  it("returns the directory with the organization timezone", async () => {
    // The same reason /api/events returns it: the client formats dates wherever
    // it renders them, and must not guess the campus timezone.
    const res = await GET(get());

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      attendees: [],
      pagination: { page: 1, pageSize: 25, total: 0, totalPages: 1 },
      timezone: "Asia/Manila",
    });
  });

  it("defaults to the first page when nothing is asked for", async () => {
    await GET(get());

    expect(searchGlobalAttendees).toHaveBeenCalledWith({
      adminId: "admin-1",
      search: undefined,
      attendedOnly: false,
      page: 1,
      pageSize: 25,
    });
  });

  it("passes a search term through", async () => {
    await GET(get("?q=andrea"));

    expect(searchGlobalAttendees.mock.calls[0][0].search).toBe("andrea");
  });

  it("passes the past-attendee filter through", async () => {
    await GET(get("?attendedOnly=true"));

    expect(searchGlobalAttendees.mock.calls[0][0].attendedOnly).toBe(true);
  });

  it("accepts page and pageSize", async () => {
    await GET(get("?page=3&pageSize=10"));

    expect(searchGlobalAttendees).toHaveBeenCalledWith(
      expect.objectContaining({ page: 3, pageSize: 10 })
    );
  });

  describe("rejects nonsense rather than guessing", () => {
    it("rejects a page that is not a whole number", async () => {
      for (const page of ["0", "-1", "1.5", "abc"]) {
        const res = await GET(get(`?page=${page}`));

        expect(res.status, `page=${page} should be rejected`).toBe(400);
      }

      expect(searchGlobalAttendees).not.toHaveBeenCalled();
    });

    it("rejects a page size above the cap", async () => {
      const res = await GET(get("?pageSize=101"));

      expect(res.status).toBe(400);
      // An unbounded page would let one request read the whole registry.
      expect(searchGlobalAttendees).not.toHaveBeenCalled();
    });

    it("rejects a page size of zero", async () => {
      expect((await GET(get("?pageSize=0"))).status).toBe(400);
    });

    it("rejects an attendedOnly that is not a boolean", async () => {
      const res = await GET(get("?attendedOnly=yes"));

      expect(res.status).toBe(400);
      expect(searchGlobalAttendees).not.toHaveBeenCalled();
    });

    it("rejects an over-long search term", async () => {
      const res = await GET(get(`?q=${"a".repeat(201)}`));

      expect(res.status).toBe(400);
      // A pasted paragraph should not become an unbounded scan.
      expect(searchGlobalAttendees).not.toHaveBeenCalled();
    });
  });

  it("treats an empty parameter as absent", async () => {
    await GET(get("?q=&page=&attendedOnly="));

    expect(searchGlobalAttendees).toHaveBeenCalledWith(
      expect.objectContaining({ search: undefined, page: 1, attendedOnly: false })
    );
  });

  it("explains the problem in plain language", async () => {
    // No jargon and no internal names, per the charter.
    const res = await GET(get("?pageSize=101"));

    expect((await res.json()).error).toBe("Value must not be greater than 100.");
  });
});
