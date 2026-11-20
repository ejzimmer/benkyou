import * as SunCalc from 'suncalc';
import { GardenLocation } from './gardenLocation';

type TimeOfDay = 'night' | 'dawn' | 'day' | 'dusk';

export function findTimeOfDay(
  now: number,
  { latitude, longitude }: GardenLocation,
): TimeOfDay {
  const { dawn, goldenHourEnd, goldenHour, dusk } = SunCalc.getTimes(
    new Date(now),
    latitude,
    longitude,
  );
  if (now < dawn.getTime() || now >= dusk.getTime()) return 'night';
  if (now < goldenHourEnd.getTime()) return 'dawn';
  if (now < goldenHour.getTime()) return 'day';
  return 'dusk';
}
