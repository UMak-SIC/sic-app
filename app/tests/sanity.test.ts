import { expect, test } from "vitest";

import { hasTestDatabase } from "./database";

test("the Vitest runner is configured", () => {
  expect(hasTestDatabase()).toBeTypeOf("boolean");
});
