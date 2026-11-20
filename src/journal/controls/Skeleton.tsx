import './Skeleton.css';

type SkeletonProps = { numRows: number };

export function Skeleton({ numRows }: SkeletonProps) {
  const rows = Array.from({ length: numRows });

  return (
    <div className="skeleton">
      <div>Loading...</div>
      {rows.map((_, i) => (
        <div
          key={i}
          className="row"
          style={{ animationDelay: `${i * 0.2}s` }}
        />
      ))}
    </div>
  );
}
