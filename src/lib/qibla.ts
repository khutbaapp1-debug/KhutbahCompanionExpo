export interface QiblaResult {
  direction: number;
  distance: number;
}

const KAABA_LAT = 21.4225;
const KAABA_LNG = 39.8262;

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

function toDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

export function calculateQiblaDirection(userLat: number, userLng: number): QiblaResult {
  const lat1 = toRadians(userLat);
  const lng1 = toRadians(userLng);
  const lat2 = toRadians(KAABA_LAT);
  const lng2 = toRadians(KAABA_LNG);

  const dLng = lng2 - lng1;

  const y = Math.sin(dLng);
  const x = Math.cos(lat1) * Math.tan(lat2) - Math.sin(lat1) * Math.cos(dLng);

  let direction = toDegrees(Math.atan2(y, x));

  direction = (direction + 360) % 360;

  const R = 6371;
  const dLat = lat2 - lat1;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return {
    direction,
    distance,
  };
}

export function getCardinalDirection(degrees: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}
