interface SkeletonProps {
  className?: string;
}

export default function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      role="presentation"
      aria-hidden="true"
      className={`skeleton ${className}`}
    />
  );
}
