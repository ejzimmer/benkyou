export function Dinosaur() {
  return (
    <svg className="dinosaur" viewBox="-2 0 90 56" width="72">
      <g className="far-legs">
        <rect x="31" y="38" width="6" height="16" rx="2" />
        <rect x="50" y="38" width="6" height="16" rx="2" />
      </g>
      <path
        className="dinosaur-skin"
        d="M24 28C14 31 6 34 0 40C8 39 16 40 26 39ZM50 25C57 20 61 13 64 5L76 6C72 17 65 27 58 34Z"
      />
      <ellipse className="dinosaur-skin" cx="40" cy="32" rx="20" ry="13" />
      <ellipse className="dinosaur-skin" cx="71" cy="7" rx="8" ry="5.5" />
      <circle className="dinosaur-spot" cx="34" cy="25" r="3" />
      <circle className="dinosaur-spot" cx="44" cy="23" r="2.2" />
      <circle className="dinosaur-spot" cx="40" cy="31" r="2" />
      <circle className="dinosaur-eye" cx="73.5" cy="5.5" r="1.2" />
      <g className="near-legs">
        <rect x="26" y="38" width="6" height="16" rx="2" />
        <rect x="45" y="38" width="6" height="16" rx="2" />
      </g>
    </svg>
  );
}
