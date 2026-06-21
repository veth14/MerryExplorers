type ActivityStar = {
  name: string;
  place: string;
  posts: number;
};

type ActivityStarsProps = {
  items: readonly ActivityStar[];
};

export function ActivityStars({ items }: ActivityStarsProps) {
  return (
    <article className="rounded-[1.5rem] bg-white p-6 pb-8 shadow-[0_12px_24px_-8px_rgba(0,0,0,0.08)] relative border-[3px] border-[#ffb800]">
      <div className="flex items-center justify-between gap-4 mt-2">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center text-[#ffb800]">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clipRule="evenodd" /></svg>
          </span>
          <h2 className="font-headline text-[22px] font-extrabold text-[#002f76]">Activity Stars</h2>
        </div>
      </div>
      
      <div className="absolute right-[-3px] top-[-3px] rounded-bl-[1.5rem] rounded-tr-[1.3rem] bg-[#ffb800] px-5 py-2 text-[11px] font-extrabold uppercase tracking-widest text-[#002f76]">
        Top Contributors
      </div>

      <div className="mt-8 flex flex-col gap-2">
        {items.map((star, index) => (
          <div key={star.name} className={`flex items-center justify-between gap-4 p-3 rounded-[1rem] ${index === 0 ? 'bg-[#f4f8fb]' : ''}`}>
            <div className="flex items-center gap-4">
              <div className="flex relative h-[48px] w-[48px] items-center justify-center rounded-full border border-dashed border-[#a0aec0] bg-white text-[10px] font-bold text-[#002f76] overflow-hidden">
                <span className="opacity-50">Teach<br/>{index+1}</span>
                <img src="/LOGO.jpg" alt="" className="absolute inset-0 w-full h-full object-cover opacity-10" />
                <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#ffb800] text-[12px] font-black text-white border-[3px] border-white z-10">
                  {index+1}
                </div>
              </div>
              <div className="leading-tight">
                <p className="text-[15px] font-bold text-[#0050d5]">{star.name}</p>
                <p className="text-[12px] font-bold text-[#0050d5]/70">{star.place}</p>
              </div>
            </div>
            <div className={`rounded-full px-5 py-2 text-sm font-bold text-[#002f76]/60 flex items-center gap-2 ${index === 0 ? 'bg-white shadow-sm' : 'bg-[#f4f8fb]'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-[#ffb800]"><path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clipRule="evenodd" /></svg>
              <span className="text-[#002f76] text-[15px]">{star.posts}</span> posts
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}
