// Mirrors SubjectCard's DOM structure block-for-block — including the action
// footer — so swapping skeleton -> data does not reflow the grid. Measured
// against a card with no exception chip; cards that do carry one grow by the
// chip's height, which is unavoidable without reserving space that is usually
// empty.
export default function SubjectCardSkeleton() {
  return (
    <div className="flex flex-col bg-white rounded-2xl border border-outline-variant shadow-sm animate-pulse">
      <div className="p-5 pb-4">
        {/* identity row */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-gray-200 shrink-0" />
          <div className="flex-1 min-w-0 pt-0.5">
            <div className="h-[15px] bg-gray-200 rounded w-24 mb-2" />
            <div className="h-3 bg-gray-100 rounded w-32" />
          </div>
          <div className="h-5 w-[74px] bg-gray-100 rounded-md shrink-0" />
        </div>

        {/* hero metric */}
        <div className="mb-3">
          <div className="h-7 bg-gray-200 rounded w-28" />
          <div className="h-3 bg-gray-100 rounded w-36 mt-3" />
        </div>

        {/* supporting metrics line */}
        <div className="h-4 bg-gray-100 rounded w-full max-w-[240px]" />
      </div>

      {/* action footer */}
      <div className="mt-auto flex items-center gap-2 px-5 py-3 border-t border-outline-variant/70">
        <div className="h-[26px] w-[68px] bg-gray-200 rounded-lg" />
        <div className="h-[26px] w-[76px] bg-gray-100 rounded-lg" />
        <div className="ml-auto h-7 w-7 bg-gray-100 rounded-lg" />
      </div>
    </div>
  )
}
