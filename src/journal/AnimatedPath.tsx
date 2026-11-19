import { useEffect, useRef, useState } from 'react';

type AnimatedPathProps = {
  d: string;
  draw: boolean;
  onTransitionEnd?: React.TransitionEventHandler<SVGPathElement>;
};

export function AnimatedPath({ d, draw, onTransitionEnd }: AnimatedPathProps) {
  const ref = useRef<SVGPathElement>(null);
  const [strokeLength, setStrokeLength] = useState(0);
  const [strokeOffset, setStrokeOffset] = useState(0);

  useEffect(() => {
    if (!ref.current) return;

    const strokeLength = ref.current.getTotalLength();
    setStrokeLength(strokeLength);
    setStrokeOffset(strokeLength);
  }, []);

  if (draw && strokeOffset > 0) {
    requestAnimationFrame(() => {
      if (ref.current) {
        ref.current.style.transition = `stroke-dashoffset ${strokeLength * 3}ms linear`;
        setStrokeOffset(0);
      }
    });
  }

  if (strokeOffset === 0 && !draw && ref.current) {
    ref.current.style.transition = 'none';
    setStrokeOffset(strokeLength);
  }

  return (
    <path
      ref={ref}
      strokeDasharray={strokeLength}
      strokeDashoffset={strokeOffset}
      d={d}
      onTransitionEnd={onTransitionEnd}
    />
  );
}
