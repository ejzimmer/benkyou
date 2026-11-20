export type Trip = {
  rise: number;
  set: number;
};

export type ArcPosition = {
  across: number;
  height: number;
};

export function findArcPosition(
  now: number,
  { rise, set }: Trip,
): ArcPosition | undefined {
  if (now < rise || now > set) return undefined;

  const across = (now - rise) / (set - rise);
  return { across, height: Math.sin(Math.PI * across) };
}
