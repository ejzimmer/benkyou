export function GardenHills() {
  return (
    <svg
      className="garden-hills"
      viewBox="0 0 320 50"
      preserveAspectRatio="none"
    >
      <path
        className="far-hills"
        d="M0 32C40 32 60 8 110 8C160 8 180 32 220 32C250 32 270 20 290 20C305 20 310 32 320 32V50H0Z"
      />
      <path
        className="near-hills"
        d="M0 46C30 46 40 30 70 30C110 30 130 48 170 48C210 48 230 28 270 28C300 28 310 46 320 46V50H0Z"
      />
      <path
        className="hills-edge"
        d="M0 46C30 46 40 30 70 30C110 30 130 48 170 48C210 48 230 28 270 28C300 28 310 46 320 46"
      />
    </svg>
  );
}
