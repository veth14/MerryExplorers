import type { Teacher } from "@/data/teachers";

type TeacherCardProps = {
  teacher: Teacher;
};

function EmailIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 shrink-0">
      <path d="M1.5 8.322v7.928A2.25 2.25 0 0 0 3.75 18.5h16.5a2.25 2.25 0 0 0 2.25-2.25V8.322l-9.47 5.58a.75.75 0 0 1-.76 0L1.5 8.322Z" />
      <path d="M22.5 6.908V6.75a2.25 2.25 0 0 0-2.25-2.25H3.75A2.25 2.25 0 0 0 1.5 6.75v.158l10.5 6.188 10.5-6.188Z" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 shrink-0">
      <path fillRule="evenodd" d="M1.5 4.5a3 3 0 0 1 3-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 0 1-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 0 0 6.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 0 1 1.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 0 1-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5Z" clipRule="evenodd" />
    </svg>
  );
}

function DotsIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M4.5 12a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Zm6 0a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Zm6 0a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Z" clipRule="evenodd" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 0 1 3.878.512.75.75 0 1 1-.256 1.478l-.209-.035-1.005 13.07a3 3 0 0 1-2.991 2.77H8.084a3 3 0 0 1-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 0 1-.256-1.478A48.567 48.567 0 0 1 7.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 0 1 3.369 0c1.603.051 2.815 1.387 2.815 2.951Zm-6.136-1.452a51.196 51.196 0 0 1 3.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 0 0-6 0v-.113c0-.794.609-1.428 1.364-1.452Zm-.355 5.945a.75.75 0 1 0-1.5.058l.347 9a.75.75 0 1 0 1.499-.058l-.346-9Zm5.48.058a.75.75 0 1 0-1.498-.058l-.347 9a.75.75 0 0 0 1.5.058l.345-9Z" clipRule="evenodd" />
    </svg>
  );
}

export function TeacherCard({ teacher }: TeacherCardProps) {
  const isOnLeave = teacher.status === "on-leave";

  return (
    <article
      className={`relative flex flex-col rounded-[1.25rem] bg-white shadow-[0_4px_20px_-4px_rgba(0,47,118,0.10)] border border-[#e8effe] overflow-hidden transition-transform hover:-translate-y-0.5 hover:shadow-[0_8px_28px_-6px_rgba(0,47,118,0.16)] ${isOnLeave ? "opacity-80" : ""}`}
    >
      {/* ON LEAVE badge */}
      {isOnLeave && (
        <div className="absolute top-3 right-10 bg-[#f0f0f0] text-[#777] text-[10px] font-extrabold tracking-widest uppercase px-2.5 py-1 rounded-full">
          ON LEAVE
        </div>
      )}

      {/* Three-dots menu */}
      <button className="absolute top-3 right-3 text-[#a0aec0] hover:text-[#002f76] transition-colors p-0.5 rounded-md hover:bg-[#f0f4f9]">
        <DotsIcon />
      </button>

      {/* Card body */}
      <div className="px-5 pt-5 pb-4 flex flex-col gap-3 flex-1">
        {/* Avatar + name */}
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-extrabold text-[18px] border-[3px] border-white shadow-md ${isOnLeave ? "grayscale" : ""}`}
              style={{ backgroundColor: teacher.avatarColor }}
            >
              {teacher.initials}
            </div>
            {/* Online dot — only for active */}
            {!isOnLeave && (
              <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-[#2da05b] border-2 border-white" />
            )}
          </div>

          {/* Name + role */}
          <div className="mt-0.5 min-w-0">
            <p className="font-headline text-[16px] font-extrabold text-[#002f76] leading-tight truncate">
              {teacher.name}
            </p>
            <p className="text-[12.5px] font-semibold text-[#5a6e8c] mt-0.5">{teacher.role}</p>
          </div>
        </div>

        {/* Class chip */}
        <div>
          {teacher.classAssigned ? (
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11.5px] font-bold border ${
                teacher.role === "Lead Teacher"
                  ? "bg-[#fff8e1] text-[#a07000] border-[#ffd54f]"
                  : "bg-[#e8effe] text-[#0050d5] border-[#c5d6ff]"
              }`}
            >
              {teacher.classAssigned}
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11.5px] font-bold bg-[#f4f4f4] text-[#999] border border-[#e0e0e0]">
              Unassigned
            </span>
          )}
        </div>

        {/* Contact info */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-[12.5px] text-[#5a6e8c]">
            <span className={isOnLeave ? "text-[#bbb]" : "text-[#0050d5]"}>
              <EmailIcon />
            </span>
            <span className="truncate font-semibold">{teacher.email}</span>
          </div>
          <div className="flex items-center gap-2 text-[12.5px] text-[#5a6e8c]">
            <span className={isOnLeave ? "text-[#bbb]" : "text-[#0050d5]"}>
              <PhoneIcon />
            </span>
            <span className="font-semibold">{teacher.phone}</span>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-[#f0f4f9] mx-5" />

      {/* Action buttons */}
      <div className="px-5 py-3 flex items-center gap-2">
        {isOnLeave ? (
          <button className="flex-1 rounded-[10px] border border-[#d0d8e8] py-2 text-[13px] font-bold text-[#5a6e8c] hover:bg-[#f0f4f9] transition-colors">
            View Profile
          </button>
        ) : (
          <>
            <button className="flex-1 rounded-[10px] border border-[#c5d6ff] bg-[#f0f5ff] py-2 text-[13px] font-bold text-[#0050d5] hover:bg-[#dde8ff] transition-colors">
              Edit
            </button>
            <button className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-[#ffd5d5] bg-[#fff0f0] text-[#e53935] hover:bg-[#ffe0e0] transition-colors">
              <TrashIcon />
            </button>
          </>
        )}
      </div>
    </article>
  );
}
