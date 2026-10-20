import { expect, test } from "vitest";
import { csvAttachment, toCsv } from "@/lib/csv";

test("escapes quotes, commas, newlines and spreadsheet formulas with a UTF-8 marker", () => {
  expect(toCsv(["Name", "Details"], [['María "Mia", Santos', "Line 1\nLine 2"], ["=1+1", null]]))
    .toBe('\uFEFF"Name","Details"\r\n"María ""Mia"", Santos","Line 1\nLine 2"\r\n"\'=1+1",""');
});
test("sanitizes attachment names and supports Unicode names", () => {
  const response = csvAttachment("csv", 'María\r\n"/event.csv');
  expect(response.headers.get("Content-Disposition")).toContain("filename*=UTF-8''Mar%C3%ADa____event.csv");
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
});
