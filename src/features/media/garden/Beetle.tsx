import { useEffect, useRef, useState } from 'react';
import { chooseScuttleTarget } from './chooseScuttleTarget';
import { findBeetlePose } from './findBeetlePose';
import { LadyBeetle } from './LadyBeetle';
import { BeetleSpot } from './placeBeetles';

const SCALE = 0.4;
const MS_PER_PIXEL = 70;
const SHORTEST_REST = 1500;
const LONGEST_REST = 9000;
const LEG_SWING = 2.2;
const LEG_BEAT = 35;

const easeInOut = (t: number) =>
  t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;

type BeetleProps = { spot: BeetleSpot };

export function Beetle({ spot }: BeetleProps) {
  const [position, setPosition] = useState({
    at: spot.at,
    forward: spot.forward,
    legSwing: 0,
  });
  const atRef = useRef(spot.at);
  const { length } = spot;
  const [min, max] = spot.range;

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    let frame: number;

    const rest = () => {
      timeout = setTimeout(
        scuttle,
        SHORTEST_REST + Math.random() * (LONGEST_REST - SHORTEST_REST),
      );
    };

    const scuttle = () => {
      const from = atRef.current;
      const target = chooseScuttleTarget(from, [min, max], length, Math.random);
      if (target === undefined) return rest();
      const duration = Math.abs(target - from) * length * MS_PER_PIXEL;
      let start: number | undefined;

      const step = (now: number) => {
        start ??= now;
        const t = Math.min(1, (now - start) / duration);
        atRef.current = from + (target - from) * easeInOut(t);
        setPosition({
          at: atRef.current,
          forward: target > from,
          legSwing: t < 1 ? Math.sin(now / LEG_BEAT) * LEG_SWING : 0,
        });
        if (t < 1) frame = requestAnimationFrame(step);
        else rest();
      };
      frame = requestAnimationFrame(step);
    };

    rest();
    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(frame);
    };
  }, [length, min, max]);

  const { x, y, heading, isUpsideDown } = findBeetlePose(
    spot.edges,
    position.at,
    position.forward,
    spot.isUnderside,
  );

  return (
    <g
      data-testid="beetle"
      transform={`translate(${x} ${y}) rotate(${heading}) scale(${SCALE} ${isUpsideDown ? -SCALE : SCALE})`}
    >
      <g transform="translate(-18 -27)">
        <LadyBeetle colour={spot.colour} legSwing={position.legSwing} />
      </g>
    </g>
  );
}
