'use client';

import { useEffect, useState } from 'react';
import NclexRegistrationForm from './NclexRegistrationForm';

export default function NclexRegistrationCTA() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <>
      <section className="mt-20 relative rounded-3xl overflow-hidden shadow-[0_0_60px_rgba(14,165,233,0.25)]">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-indigo-900 to-purple-900" />
        <div className="absolute inset-0 opacity-50 bg-[radial-gradient(circle_at_top,_rgba(129,140,248,0.4),_transparent_55%)]" />
        <div className="absolute inset-0 opacity-30 bg-[url('https://www.transparenttextures.com/patterns/fabric-of-squares.png')]" />
        <div className="relative max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-6 px-8 py-10">
          <div className="flex-1 text-white">
            <p className="text-sm uppercase tracking-[0.4em] text-cyan-200 font-semibold mb-4">NCLEX-RN Enrollment</p>
            <h2 className="text-3xl font-bold mb-3 leading-snug">Deploy the Registration Command Console</h2>
            <p className="text-indigo-100/80">
              Collect every document requirement upfront—no login needed. Share official information securely and let our team
              prepare your NCLEX-RN package.
            </p>
          </div>
          <button
            onClick={() => setIsOpen(true)}
            className="px-8 py-4 bg-gradient-to-r from-cyan-400 to-fuchsia-500 text-slate-900 font-semibold rounded-2xl shadow-[0_15px_40px_rgba(236,72,153,0.45)] hover:scale-[1.02] transition"
          >
            Open Registration Form
          </button>
        </div>
      </section>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div className="relative max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-slate-900 border border-white/10 shadow-[0_0_50px_rgba(99,102,241,0.4)]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 sticky top-0 bg-slate-900 rounded-t-3xl z-10">
              <div>
                <p className="text-xs text-indigo-200 font-semibold uppercase tracking-[0.4em]">NCLEX-RN Registration</p>
                <h3 className="text-xl font-bold text-white">NursePro Academy Intake Form</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Close registration form"
                className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-4 pb-6">
              <NclexRegistrationForm variant="modal" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

