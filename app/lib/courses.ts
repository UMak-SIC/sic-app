/**
 * The three computing courses, and how a stored course value maps onto them.
 *
 * Shared deliberately: the participation service groups by what the registry stored,
 * and the chart colours those groups. If the two recognised codes separately they
 * could disagree, and a bar would end up in a colour its own tab does not use.
 *
 * This decides **ordering and appearance only**. It never merges two stored values
 * into one series — that would be inventing a course nobody wrote, which is the
 * failure mode the registry's previous course parser had.
 */

/** In the order the directory presents them. */
export const CANONICAL_COURSE_ORDER = ["BSIT", "BSCS", "BSINS"] as const;

/** The label for students whose course was never recorded. */
export const UNRECORDED_COURSE = "Not recorded";

/**
 * The known code a stored value belongs to, or null when it is not one of them.
 *
 * Recognises punctuation and casing ("BS-IT", "bsit") but not a spelled-out name.
 * "BS Information Technology" is a different stored value from "BSIT" and is left as
 * its own series rather than guessed at.
 */
export function canonicalCourseCode(stored: string): (typeof CANONICAL_COURSE_ORDER)[number] | null {
  const letters = stored.toUpperCase().replace(/[^A-Z]/g, "");

  return CANONICAL_COURSE_ORDER.find((code) => letters.startsWith(code)) ?? null;
}

/**
 * Display order for a set of stored course values: the three computing courses in
 * their usual order, then anything else alphabetically, then the students whose
 * course was never recorded.
 */
export function compareCourses(left: string, right: string): number {
  if (left === UNRECORDED_COURSE) return right === UNRECORDED_COURSE ? 0 : 1;
  if (right === UNRECORDED_COURSE) return -1;

  const leftCode = canonicalCourseCode(left);
  const rightCode = canonicalCourseCode(right);

  if (leftCode && rightCode) {
    return CANONICAL_COURSE_ORDER.indexOf(leftCode) - CANONICAL_COURSE_ORDER.indexOf(rightCode);
  }

  // A known code outranks an unrecognised one, so the legend keeps its shape even
  // when the registry holds a course nobody expected.
  if (leftCode) return -1;
  if (rightCode) return 1;

  return left.localeCompare(right);
}