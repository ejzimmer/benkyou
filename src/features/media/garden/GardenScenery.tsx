import { CSSProperties } from 'react';
import * as SunCalc from 'suncalc';
import { Dinosaur } from './Dinosaur';
import { GardenHills } from './GardenHills';
import { Moon } from './Moon';
import { SkyBody } from './SkyBody';
import { SkyCloud } from './SkyCloud';
import { Stars } from './Stars';
import { GardenLocation } from './gardenLocation';
import { findArcPosition } from './findArcPosition';
import { findMoonTrip } from './findMoonTrip';
import { findSunTrip } from './findSunTrip';

type GardenSceneryProps = {
  horizon: number;
  now: number;
  location: GardenLocation;
};

export function GardenScenery({ horizon, now, location }: GardenSceneryProps) {
  const sun = findArcPosition(now, findSunTrip(now, location));
  const moonTrip = findMoonTrip(now, location);
  const moon = moonTrip && findArcPosition(now, moonTrip);
  const { phase } = SunCalc.getMoonIllumination(new Date(now));

  return (
    <div
      className="garden-scenery"
      aria-hidden="true"
      style={{ '--horizon': `${horizon}px` } as CSSProperties}
    >
      <div className="sky">
        <Stars />
        {moon && (
          <SkyBody className="moon-body" position={moon}>
            <Moon phase={phase} isSouthern={location.latitude < 0} />
          </SkyBody>
        )}
        {sun && <SkyBody className="sun" position={sun} />}
        <SkyCloud y="12%" scale={1} drift={0.1} />
        <SkyCloud y="34%" scale={0.7} drift={0.45} />
        <SkyCloud y="22%" scale={0.85} drift={0.8} />
        <GardenHills />
        <Dinosaur />
      </div>
      <div className="meadow" />
    </div>
  );
}
