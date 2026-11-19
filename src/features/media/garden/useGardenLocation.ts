import { useEffect, useState } from 'react';
import {
  GARDEN_LOCATION_STORAGE_KEY,
  GardenLocation,
  estimateGardenLocationFromTimeZone,
  readStoredGardenLocation,
} from './gardenLocation';

export function useGardenLocation() {
  const [location, setLocation] = useState<GardenLocation>(
    () => readStoredGardenLocation() ?? estimateGardenLocationFromTimeZone(),
  );

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      const found = {
        latitude: Math.round(coords.latitude * 100) / 100,
        longitude: Math.round(coords.longitude * 100) / 100,
      };
      localStorage.setItem(GARDEN_LOCATION_STORAGE_KEY, JSON.stringify(found));
      setLocation(found);
    });
  }, []);

  return location;
}
