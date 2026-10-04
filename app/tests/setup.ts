import { afterAll, afterEach, beforeEach } from "vitest";

import { cleanTestDatabase, disconnectTestDatabase } from "./database";

// A configured test database starts and ends each test clean. Unit tests stay
// fully offline when TEST_DATABASE_URL is absent.
beforeEach(async () => {
  await cleanTestDatabase();
});

afterEach(async () => {
  await cleanTestDatabase();
});

afterAll(async () => {
  await disconnectTestDatabase();
});

export {
  cleanTestDatabase,
  disconnectTestDatabase,
  getTestDatabase,
  hasTestDatabase,
  seedTestDatabase,
  withTestTransaction,
} from "./database";
