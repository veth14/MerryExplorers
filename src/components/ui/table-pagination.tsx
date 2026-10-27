"use client";

const PAGE_SIZES = [10, 20, 50];

type TablePaginationProps = {
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  itemLabel: string;
  ariaLabel: string;
  context?: string;
};

export function TablePagination({
  total,
  page,
  pageCount,
  pageSize,
  onPageChange,
  onPageSizeChange,
  itemLabel,
  ariaLabel,
  context,
}: TablePaginationProps) {
  const first = total ? (page - 1) * pageSize + 1 : 0;
  const last = Math.min(page * pageSize, total);
  const windowStart = Math.max(1, Math.min(page - 2, pageCount - 4));
  const pages = Array.from({ length: Math.min(pageCount, 5) }, (_, index) => windowStart + index);

  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 bg-[#f8fafc] px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] font-semibold text-[#64748b]">
        <span>
          Showing <span className="font-extrabold text-[#002f76]">{first}–{last}</span> of{" "}
          <span className="font-extrabold text-[#002f76]">{total}</span> {itemLabel}
          {context && <span className="text-[#94a3b8]"> · {context}</span>}
        </span>
        <label className="flex items-center gap-2">
          Rows per page
          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[12px] font-bold text-[#002f76] outline-none focus:border-[#0033A0]/40"
            aria-label={`${ariaLabel} rows per page`}
          >
            {PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>
      </div>

      <nav aria-label={ariaLabel} className="flex items-center gap-1 self-start sm:self-auto">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="rounded-lg border border-slate-200 px-3 py-2 text-[12px] font-bold text-[#31547f] transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>
        {pages.map((pageNumber) => (
          <button
            type="button"
            key={pageNumber}
            onClick={() => onPageChange(pageNumber)}
            aria-current={pageNumber === page ? "page" : undefined}
            aria-label={`Page ${pageNumber}`}
            className={`h-9 min-w-9 rounded-lg px-2 text-[12px] font-extrabold transition-colors ${pageNumber === page ? "bg-[#0033A0] text-white shadow-sm" : "border border-slate-200 text-[#31547f] hover:bg-white"}`}
          >
            {pageNumber}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(pageCount, page + 1))}
          disabled={page === pageCount}
          className="rounded-lg border border-slate-200 px-3 py-2 text-[12px] font-bold text-[#31547f] transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </nav>
    </div>
  );
}
