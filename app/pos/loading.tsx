export default function PosLoading() {
  return (
    <main aria-busy="true" aria-label="Loading store page" className="mx-auto w-full max-w-[1560px] px-4 py-7 sm:px-7 lg:px-9">
      <div aria-hidden="true" className="h-7 w-40 animate-pulse rounded bg-[#E8EAE8]" />
      <div aria-hidden="true" className="mt-3 h-4 w-64 max-w-full animate-pulse rounded bg-[#E8EAE8]" />
      <div aria-hidden="true" className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-xl border border-[#E8EAE8] bg-white" />
        ))}
      </div>
      <div aria-hidden="true" className="mt-5 h-64 animate-pulse rounded-xl border border-[#E8EAE8] bg-white" />
    </main>
  )
}
