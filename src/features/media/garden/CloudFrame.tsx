import { ReactNode, useEffect, useRef, useState } from 'react';
import { CloudShape } from './CloudShape';

type CloudFrameProps = { children: ReactNode };

export function CloudFrame({ children }: CloudFrameProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width: number; height: number }>();

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const measureSize = () =>
      setSize({ width: element.offsetWidth, height: element.offsetHeight });
    measureSize();

    const observer = new ResizeObserver(measureSize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="cloud-frame">
      {size && <CloudShape width={size.width} height={size.height} />}
      {children}
    </div>
  );
}
