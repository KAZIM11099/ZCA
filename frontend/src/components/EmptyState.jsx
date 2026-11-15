/** Calm placeholder for empty lists and missing pages. */
export function EmptyState({ title, children, action }) {
  return (
    <div className="border border-dashed border-ink/25 bg-chalk px-6 py-16 text-center md:py-24">
      <h2 className="display-m mx-auto max-w-xl">{title}</h2>
      {children && <p className="mx-auto mt-4 max-w-md text-[1rem] leading-7 text-stone">{children}</p>}
      {action && <div className="mt-8 flex flex-wrap justify-center gap-3">{action}</div>}
    </div>
  );
}
