export interface CalendarInterval {
  id: string;
  start: number;
  end: number;
}

export interface PositionedCalendarInterval<T extends CalendarInterval> {
  item: T;
  lane: number;
  laneCount: number;
}

/**
 * Assign overlapping calendar intervals to stable side-by-side lanes.
 * Intervals that only touch at an endpoint do not overlap.
 */
export function layoutCalendarIntervals<T extends CalendarInterval>(
  intervals: T[],
): PositionedCalendarInterval<T>[] {
  const sorted = [...intervals].sort(
    (left, right) =>
      left.start - right.start || left.end - right.end || left.id.localeCompare(right.id),
  );
  const positioned: PositionedCalendarInterval<T>[] = [];
  let group: T[] = [];
  let groupEnd = Number.NEGATIVE_INFINITY;

  const flushGroup = () => {
    if (group.length === 0) return;

    const laneEnds: number[] = [];
    const groupPositions = group.map((item) => {
      const lane = laneEnds.findIndex((end) => end <= item.start);
      const assignedLane = lane === -1 ? laneEnds.length : lane;
      laneEnds[assignedLane] = Math.max(item.start + 1, item.end);
      return { item, lane: assignedLane };
    });
    const laneCount = laneEnds.length;
    positioned.push(...groupPositions.map((position) => ({ ...position, laneCount })));
    group = [];
    groupEnd = Number.NEGATIVE_INFINITY;
  };

  for (const interval of sorted) {
    if (group.length > 0 && interval.start >= groupEnd) flushGroup();
    group.push(interval);
    groupEnd = Math.max(groupEnd, Math.max(interval.start + 1, interval.end));
  }
  flushGroup();

  return positioned;
}
