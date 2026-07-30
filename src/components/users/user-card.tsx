"use client";

import { useState } from "react";
import type { UserAccount, UserStatus } from "@/data/users";

type UserCardProps = {
  user: UserAccount;
  onEdit: (user: UserAccount) => void;
  onDelete: (userId: string) => void;
};

const statusConfig: Record<UserStatus, { label: string; dot: string; text: string; bg: string }> = {
  active:   { label: "Active",   dot: "bg-[#2da05b]", text: "text-[#1a7a4a]", bg: "bg-[#e8f9f0]" },
  inactive: { label: "Inactive", dot: "bg-[#bdbdbd]", text: "text-[#616161]", bg: "bg-[#f5f5f5]" },
  "on-leave": { label: "On Leave", dot: "bg-[#ffb800]", text: "text-[#a07000]", bg: "bg-[#fff8e1]" },
};

const roleConfig: Record<string, { bg: string; text: string; border: string }> = {
  "Lead Teacher":      { bg: "bg-[#fff8e1]", text: "text-[#a07000]", border: "border-[#ffd54f]" },
  "Assistant Teacher": { bg: "bg-[#e8effe]", text: "text-[#0050d5]", border: "border-[#c5d6ff]" },
};

function EditIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M21.731 2.269a2.625 2.625 0 0 0-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 0 0 0-3.712ZM19.513 8.199l-3.712-3.712-12.15 12.15a5.25 5.25 0 0 0-1.32 2.214l-.8 2.685a.75.75 0 0 0 .933.933l2.685-.8a5.25 5.25 0 0 0 2.214-1.32L19.513 8.2Z" />
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

export function UserCard({ user, onEdit, onDelete }: UserCardProps) {
  const [imgError, setImgError] = useState(false);
  const status = statusConfig[user.status] || { label: user.status, dot: "bg-gray-400", text: "text-gray-600", bg: "bg-gray-100" };
  const role = roleConfig[user.role] || { bg: "bg-[#f0f4f9]", text: "text-[#5a6e8c]", border: "border-[#d0d8e8]" };
  const isOnLeave = user.status === "on-leave";

  const showInitials = !user.avatarUrl || imgError;

  return (
    <article className={`relative flex flex-col rounded-[1.25rem] bg-white shadow-[0_4px_20px_-4px_rgba(0,47,118,0.10)] border border-[#e8effe] overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_28px_-6px_rgba(0,47,118,0.18)] ${isOnLeave ? "opacity-80" : ""}`}>

      {/* Banner strip */}
      <div className="h-16 bg-gradient-to-r from-[#d1dff9] to-[#e8f0ff] relative shrink-0">
        {/* Status badge top-right */}
        <div className={`absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold ${status.bg} ${status.text}`}>
          <span className={`w-2 h-2 rounded-full ${status.dot}`} />
          {status.label}
        </div>
      </div>

      {/* Avatar — overlaps banner */}
      <div className="px-5 -mt-10 mb-3 flex items-end justify-between">
        <div className="relative">
          <div
            className={`w-20 h-20 rounded-full border-4 border-white shadow-md overflow-hidden flex items-center justify-center text-white font-extrabold text-[22px] shrink-0 ${isOnLeave ? "grayscale" : ""}`}
            style={{ backgroundColor: showInitials ? user.avatarColor : undefined }}
          >
            {!showInitials ? (
              <img
                src={user.avatarUrl}
                alt={user.fullName}
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              user.initials
            )}
          </div>
          {/* Online dot */}
          {user.status === "active" && (
            <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-[#2da05b] border-2 border-white" />
          )}
        </div>

        {/* Role chip */}
        <div className="mb-1">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${role.bg} ${role.text} ${role.border}`}>
            {user.role}
          </span>
        </div>
      </div>

      {/* Info body */}
      <div className="px-5 pb-4 flex flex-col gap-2 flex-1">
        {/* Name */}
        <div>
          <p className="font-headline text-[17px] font-extrabold text-[#002f76] leading-tight">{user.fullName}</p>
          <p className="text-[12px] font-semibold text-[#5a6e8c] mt-0.5">{user.assignedRoom}</p>
        </div>

        {/* Tags */}
        {user.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {user.tags.map((tag) => (
              <span
                key={tag}
                className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                  tag === "CPR Certified"
                    ? "bg-[#e8f0ff] text-[#0050d5]"
                    : "bg-[#fff8e1] text-[#a07000]"
                }`}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Contact row */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[12px] text-[#5a6e8c]">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-[#0050d5] shrink-0">
              <path d="M1.5 8.322v7.928A2.25 2.25 0 0 0 3.75 18.5h16.5a2.25 2.25 0 0 0 2.25-2.25V8.322l-9.47 5.58a.75.75 0 0 1-.76 0L1.5 8.322Z" />
              <path d="M22.5 6.908V6.75a2.25 2.25 0 0 0-2.25-2.25H3.75A2.25 2.25 0 0 0 1.5 6.75v.158l10.5 6.188 10.5-6.188Z" />
            </svg>
            <span className="truncate font-semibold">{user.email}</span>
          </div>
          <div className="flex items-center gap-2 text-[12px] text-[#5a6e8c]">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-[#0050d5] shrink-0">
              <path fillRule="evenodd" d="M1.5 4.5a3 3 0 0 1 3-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 0 1-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 0 0 6.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 0 1 1.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 0 1-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5Z" clipRule="evenodd" />
            </svg>
            <span className="font-semibold">{user.phone}</span>
          </div>
        </div>

        {/* Work details chip row */}
        <div className="flex items-center gap-2 pt-0.5">
          <span className="text-[11px] font-bold text-[#8898aa] bg-[#f0f4f9] px-2.5 py-1 rounded-lg">
            {user.employeeId}
          </span>
          <span className="text-[11px] font-bold text-[#8898aa] bg-[#f0f4f9] px-2.5 py-1 rounded-lg truncate">
            {user.scheduleType}
          </span>
        </div>

        {/* Joined */}
        <p className="text-[11.5px] font-semibold text-[#b0bec5]">Joined {user.joinDate}</p>
      </div>

      {/* Divider */}
      <div className="h-px bg-[#f0f4f9] mx-5" />

      {/* Action row */}
      <div className="px-5 py-3 flex items-center gap-2">
        <button
          onClick={() => onEdit(user)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-[10px] border border-[#c5d6ff] bg-[#f0f5ff] py-2 text-[12px] font-bold text-[#0050d5] hover:bg-[#dde8ff] transition-colors"
        >
          <EditIcon />
          Edit Profile
        </button>
        <button
          onClick={() => onDelete(user.id)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-[#ffd5d5] bg-[#fff0f0] text-[#e53935] hover:bg-[#ffe0e0] transition-colors"
        >
          <TrashIcon />
        </button>
      </div>
    </article>
  );
}
