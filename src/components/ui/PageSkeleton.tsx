/** Shown only on the very first load (later visits show cached data instantly). */
export default function PageSkeleton() {
  return (
    <div className="p-4 space-y-3" aria-busy="true" aria-label="Loading">
      <div className="h-6 w-40 rounded-lg bg-gray-100 animate-pulse" />
      <div className="h-28 rounded-2xl bg-gray-100 animate-pulse" />
      {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-2xl bg-gray-100 animate-pulse" />)}
    </div>
  );
}
