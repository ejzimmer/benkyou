const DEFAULT_EXPONENT = 4;

// Understood scores cluster around 70–95%, so a linear fill makes them all
// look alike; raising to a power spreads the top of the range out.
export const calculateBloomFraction = (
  understood: number,
  exponent = DEFAULT_EXPONENT,
) => (understood / 100) ** exponent;
