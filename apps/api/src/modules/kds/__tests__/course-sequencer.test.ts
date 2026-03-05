import { describe, it, expect } from 'vitest';
import {
  getCourseLevel,
  getCoursesToHold,
  getNextCourseToRelease,
} from '../course-sequencer';

describe('getCourseLevel', () => {
  it('should return correct level for each course', () => {
    expect(getCourseLevel('DRINK')).toBe(0);
    expect(getCourseLevel('STARTER')).toBe(1);
    expect(getCourseLevel('MAIN')).toBe(2);
    expect(getCourseLevel('DESSERT')).toBe(3);
  });

  it('should return null for unknown course', () => {
    expect(getCourseLevel('SALAD')).toBeNull();
  });

  it('should return null for null/undefined', () => {
    expect(getCourseLevel(null)).toBeNull();
    expect(getCourseLevel(undefined)).toBeNull();
  });
});

describe('getCoursesToHold', () => {
  it('should hold MAIN when STARTER is present', () => {
    const result = getCoursesToHold(['STARTER', 'MAIN']);
    expect(result).toContain('MAIN');
    expect(result.size).toBe(1);
  });

  it('should hold DESSERT when MAIN is present', () => {
    const result = getCoursesToHold(['MAIN', 'DESSERT']);
    expect(result).toContain('DESSERT');
    expect(result.size).toBe(1);
  });

  it('should hold both MAIN and DESSERT when all courses present', () => {
    const result = getCoursesToHold(['DRINK', 'STARTER', 'MAIN', 'DESSERT']);
    expect(result).toContain('MAIN');
    expect(result).toContain('DESSERT');
    expect(result.size).toBe(2);
  });

  it('should never hold DRINK or STARTER', () => {
    const result = getCoursesToHold(['DRINK', 'STARTER']);
    expect(result.size).toBe(0);
  });

  it('should hold nothing when no dependencies', () => {
    const result = getCoursesToHold(['DRINK']);
    expect(result.size).toBe(0);
  });

  it('should handle null entries gracefully', () => {
    const result = getCoursesToHold([null, 'DRINK', null]);
    expect(result.size).toBe(0);
  });
});

describe('getNextCourseToRelease', () => {
  it('should release MAIN when STARTER completes', () => {
    const result = getNextCourseToRelease('STARTER', ['STARTER', 'MAIN']);
    expect(result).toBe('MAIN');
  });

  it('should release DESSERT when MAIN completes', () => {
    const result = getNextCourseToRelease('MAIN', ['MAIN', 'DESSERT']);
    expect(result).toBe('DESSERT');
  });

  it('should return null when no next course exists', () => {
    const result = getNextCourseToRelease('DESSERT', ['DESSERT']);
    expect(result).toBeNull();
  });

  it('should return null when next course not in order', () => {
    const result = getNextCourseToRelease('STARTER', ['STARTER', 'DESSERT']);
    expect(result).toBeNull();
  });

  it('should return null for unknown course type', () => {
    const result = getNextCourseToRelease('SALAD', ['SALAD', 'MAIN']);
    expect(result).toBeNull();
  });
});
