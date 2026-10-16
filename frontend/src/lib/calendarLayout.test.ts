import { describe, expect, it } from "vitest";
import { layoutCalendarIntervals } from "./calendarLayout";

const positionById = (items: Array<{ id: string; start: number; end: number }>) =>
  Object.fromEntries(
    layoutCalendarIntervals(items).map(({ item, lane, laneCount }) => [
      item.id,
      { lane, laneCount },
    ]),
  );

describe("layoutCalendarIntervals", () => {
  it("puts exact duplicate intervals in separate lanes", () => {
    expect(
      positionById([
        { id: "first", start: 300, end: 360 },
        { id: "second", start: 300, end: 360 },
      ]),
    ).toEqual({
      first: { lane: 0, laneCount: 2 },
      second: { lane: 1, laneCount: 2 },
    });
  });

  it("uses the maximum concurrency for a connected overlap group", () => {
    expect(
      positionById([
        { id: "long", start: 540, end: 720 },
        { id: "early", start: 570, end: 630 },
        { id: "late", start: 660, end: 750 },
      ]),
    ).toEqual({
      long: { lane: 0, laneCount: 2 },
      early: { lane: 1, laneCount: 2 },
      late: { lane: 1, laneCount: 2 },
    });
  });

  it("keeps endpoint-touching and separate intervals at full width", () => {
    expect(
      positionById([
        { id: "first", start: 480, end: 540 },
        { id: "second", start: 540, end: 600 },
        { id: "third", start: 720, end: 780 },
      ]),
    ).toEqual({
      first: { lane: 0, laneCount: 1 },
      second: { lane: 0, laneCount: 1 },
      third: { lane: 0, laneCount: 1 },
    });
  });

  it("allocates three lanes for three concurrent entries", () => {
    const positions = positionById([
      { id: "a", start: 300, end: 420 },
      { id: "b", start: 330, end: 390 },
      { id: "c", start: 345, end: 375 },
    ]);

    expect(positions).toEqual({
      a: { lane: 0, laneCount: 3 },
      b: { lane: 1, laneCount: 3 },
      c: { lane: 2, laneCount: 3 },
    });
  });
});
