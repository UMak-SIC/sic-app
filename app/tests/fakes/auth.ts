export type FakeSession = { user: { id: string } } | null;

export function createFakeNeonAuth(session: FakeSession) {
  return {
    getSession: async () => ({ data: session }),
  };
}

export const fakeAdminSession = (id = "admin-id"): FakeSession => ({ user: { id } });
export const fakeNonAdminSession = (id = "user-id"): FakeSession => ({ user: { id } });
