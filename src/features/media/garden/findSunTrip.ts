import * as SunCalc from 'suncalc';
import { GardenLocation } from './gardenLocation';
import { Trip } from './findArcPosition';

export function findSunTrip(
  now: number,
  { latitude, longitude }: GardenLocation,
): Trip {
  const { sunrise, sunset } = SunCalc.getTimes(
    new Date(now),
    latitude,
    longitude,
  );
  return { rise: sunrise.getTime(), set: sunset.getTime() };
}
