import Link from 'next/link';
import NclexRegistrationForm from '@/components/forms/NclexRegistrationForm';

export default function NclexRegistrationPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-12 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-slate-200 hover:text-white transition self-start"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to homepage
          </Link>
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-indigo-300 font-semibold mb-3">
              NCLEX-RN Intake
            </p>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
              NursePro Academy Registration Form
            </h1>
            <p className="text-slate-300 max-w-3xl">
              Share this page directly with your candidates or team. All data is encrypted in
              transit, and every field now includes guided inputs, date pickers, and quick-select
              options to reduce typing effort.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
            <span className="font-semibold text-white">Shareable URL:</span>
            <code className="px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-indigo-100">
              /nclex-registration
            </code>
            <span className="text-slate-500">(copy & send to applicants)</span>
          </div>
        </div>

        <NclexRegistrationForm variant="page" />
      </div>
    </div>
  );
}
