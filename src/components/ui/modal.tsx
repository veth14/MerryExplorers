"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function Modal({ isOpen, onClose, title, description, children, footer }: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-[#002f76]/20 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal Dialog */}
      <div className="relative w-full max-w-md transform overflow-hidden rounded-[1.25rem] bg-white text-left align-middle shadow-2xl transition-all border border-[#e8effe]">
        <div className="px-6 py-5">
          <div className="flex items-center justify-between">
            <h3 className="font-headline text-[18px] font-extrabold text-[#002f76] leading-none">
              {title}
            </h3>
            <button 
              onClick={onClose}
              className="text-[#a0aec0] hover:text-[#002f76] transition-colors p-1.5 rounded-full hover:bg-[#f0f4f9]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
              </svg>
            </button>
          </div>
          {description && (
            <p className="mt-2 text-[13px] font-semibold text-[#5a6e8c]">
              {description}
            </p>
          )}
        </div>
        
        <div className="px-6 pb-6">
          {children}
        </div>

        {footer && (
          <div className="bg-[#f8fafc] px-6 py-4 flex items-center justify-end gap-3 border-t border-[#e2e8f0]">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
