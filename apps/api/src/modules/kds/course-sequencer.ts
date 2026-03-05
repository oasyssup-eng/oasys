// ── Course Order Mapping ────────────────────────────────────────────
// DRINK (0) and STARTER (1) enter queue immediately.
// MAIN (2) is HELD until STARTER completes. DESSERT (3) until MAIN.

const COURSE_ORDER: Record<string, number> = {
  DRINK: 0,
  STARTER: 1,
  MAIN: 2,
  DESSERT: 3,
};

/**
 * Get the numeric level for a courseType. Returns null if unknown/null.
 */
export function getCourseLevel(courseType: string | null | undefined): number | null {
  if (!courseType) return null;
  return COURSE_ORDER[courseType] ?? null;
}

/**
 * Given the courseTypes present in an order, determine which should be auto-held.
 * - MAIN is held if STARTER is also present.
 * - DESSERT is held if MAIN is also present.
 * - DRINK and STARTER are never auto-held.
 */
export function getCoursesToHold(courseTypes: Array<string | null>): Set<string> {
  const present = new Set(courseTypes.filter((c): c is string => c !== null));
  const holdSet = new Set<string>();

  if (present.has('MAIN') && present.has('STARTER')) {
    holdSet.add('MAIN');
  }
  if (present.has('DESSERT') && present.has('MAIN')) {
    holdSet.add('DESSERT');
  }

  return holdSet;
}

/**
 * When a course becomes READY, determine which next course to release.
 * Returns the courseType to release, or null if nothing to release.
 */
export function getNextCourseToRelease(
  completedCourseType: string,
  orderCourseTypes: Array<string | null>,
): string | null {
  const currentLevel = COURSE_ORDER[completedCourseType];
  if (currentLevel === undefined) return null;

  const nextLevel = currentLevel + 1;
  const nextCourse = Object.entries(COURSE_ORDER).find(
    ([, level]) => level === nextLevel,
  );
  if (!nextCourse) return null;

  const [nextCourseType] = nextCourse;
  // Only release if items of that course exist in this order
  const hasNext = orderCourseTypes.some((c) => c === nextCourseType);
  return hasNext ? nextCourseType : null;
}
