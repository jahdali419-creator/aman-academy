export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite" className="space-y-5">
      <div className="skeleton h-10 w-64" />
      <div className="skeleton h-40 w-full !rounded-3xl" />
      <div className="skeleton h-32 w-full !rounded-3xl" />
      <div className="skeleton h-32 w-full !rounded-3xl" />
    </div>
  );
}
