export type GardenLocation = {
  latitude: number;
  longitude: number;
};

export const GARDEN_LOCATION_STORAGE_KEY = 'garden-location';

export function readStoredGardenLocation(): GardenLocation | undefined {
  const stored = localStorage.getItem(GARDEN_LOCATION_STORAGE_KEY);
  return stored ? JSON.parse(stored) : undefined;
}

export function estimateGardenLocationFromTimeZone(): GardenLocation {
  return {
    latitude: 0,
    longitude: -new Date().getTimezoneOffset() / 4,
  };
}
