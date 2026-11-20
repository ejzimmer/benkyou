import * as SunCalc from 'suncalc';
import { GardenLocation } from './gardenLocation';
import { Trip } from './findArcPosition';

const DAY = 24 * 60 * 60 * 1000;

export function findMoonTrip(
  now: number,
  { latitude, longitude }: GardenLocation,
): Trip | undefined {
  const days = [now - DAY, now, now + DAY].map((day) =>
    SunCalc.getMoonTimes(new Date(day), latitude, longitude),
  );
  const rises = days.flatMap(({ rise }) => (rise ? [rise.getTime()] : []));
  const sets = days.flatMap(({ set }) => (set ? [set.getTime()] : []));

  const rise = Math.max(...rises.filter((time) => time <= now));
  const set = Math.min(...sets.filter((time) => time > rise));
  if (!Number.isFinite(rise) || !Number.isFinite(set) || set < now) {
    return undefined;
  }
  return { rise, set };
}
