import { afterAll, afterEach, beforeEach } from "vitest";

import { cleanTestDatabase, disconnectTestDatabase } from "./database";

// Every test run starts and ends with the explicitly configured test database
// clean. The production application URL is never repointed by Vitest.
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
