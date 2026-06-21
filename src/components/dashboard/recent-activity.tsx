import Image from "next/image";

type ActivityItem = {
  id: string;
  author: string;
  authorRole: string;
  timeAgo: string;
  content: string;
  images: readonly string[];
  likes: number;
  comments: number;
};

type RecentActivityProps = {
  items: readonly ActivityItem[];
};

export function RecentActivity({ items }: RecentActivityProps) {
  return (
    <aside className="rounded-[1.5rem] bg-white p-6 shadow-[0_12px_24px_-8px_rgba(0,0,0,0.08)] border-[3px] border-[#0050d5]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex items-center justify-center text-[#0050d5] mt-1">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M12 9a3.75 3.75 0 1 0 0 7.5A3.75 3.75 0 0 0 12 9Z" /><path fillRule="evenodd" d="M9.344 3.071a49.52 49.52 0 0 1 5.312 0c.967.052 1.83.585 2.332 1.39l.821 1.317c.24.383.645.643 1.11.71.386.054.77.113 1.152.177 1.432.239 2.429 1.493 2.429 2.909V18a3 3 0 0 1-3 3h-15a3 3 0 0 1-3-3V9.574c0-1.416.997-2.67 2.429-2.909.382-.064.766-.123 1.151-.178a1.56 1.56 0 0 0 1.11-.71l.822-1.315a2.942 2.942 0 0 1 2.332-1.39ZM6.75 12.75a5.25 5.25 0 1 1 10.5 0 5.25 5.25 0 0 1-10.5 0Zm12-1.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" /></svg>
          </span>
          <h2 className="font-headline text-[22px] font-extrabold text-[#002f76] leading-tight">Recent<br/>Activity</h2>
        </div>
        <button className="text-sm font-bold text-[#0050d5] hover:underline flex flex-col items-end leading-tight">
          <span>View</span><span>All</span>
        </button>
      </div>

      <div className="mt-8 flex flex-col gap-6">
        {items.map((item) => (
          <article key={item.id} className="relative pb-6 border-b border-[#e2e8f0]/60 last:border-0 last:pb-0">
            <div className="flex items-center gap-3">
              <div className="flex h-[40px] w-[40px] items-center justify-center rounded-full border border-[#e2e8f0] bg-white text-[9px] font-bold text-[#002f76] relative overflow-hidden">
                <span className="opacity-50">Teach</span>
                <img src="/LOGO.jpg" alt="" className="absolute inset-0 w-full h-full object-cover opacity-10" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">
                  <span className="font-bold text-[#0050d5]">{item.author}</span> <span className="text-[#002f76]/60">uploaded {item.images.length} photos</span>
                </p>
                <p className="text-[11px] font-bold text-[#0050d5]/60">
                  {item.authorRole} • {item.timeAgo}
                </p>
              </div>
            </div>
            
            <p className="mt-3 text-[13px] font-bold text-[#002f76] leading-snug">
              {item.content}
            </p>

            {item.images.length > 0 && (
              <div className="mt-3 flex gap-2 overflow-x-auto">
                {item.images.map((image, idx) => (
                  <div key={idx} className="h-20 w-20 shrink-0 rounded-[1rem] bg-[#1a1a1a] border-[3px] border-[#1a1a1a] overflow-hidden">
                    <img src="/LOGO.jpg" alt="" className="w-full h-full object-contain bg-white" />
                  </div>
                ))}
              </div>
            )}

            <div className="mt-3 flex items-center gap-4 text-[12px] font-bold text-[#002f76]/60">
              <button className="flex items-center gap-1 hover:text-[#0050d5]">
                <span className="text-[#a0aec0]">♥</span> {item.likes}
              </button>
              <button className="flex items-center gap-1 hover:text-[#0050d5]">
                <span className="text-[#a0aec0]">💬</span> {item.comments}
              </button>
            </div>
          </article>
        ))}
      </div>
    </aside>
  );
}
