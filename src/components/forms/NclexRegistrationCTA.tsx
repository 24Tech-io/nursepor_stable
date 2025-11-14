import Link from 'next/link';

export default function NclexRegistrationCTA() {
  return (
    <section className="mt-20 relative rounded-3xl overflow-hidden shadow-[0_0_60px_rgba(14,165,233,0.25)]">
      <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-indigo-900 to-purple-900" />
      <div className="absolute inset-0 opacity-50 bg-[radial-gradient(circle_at_top,_rgba(129,140,248,0.4),_transparent_55%)]" />
      <div className="absolute inset-0 opacity-30 bg-[url('https://www.transparenttextures.com/patterns/fabric-of-squares.png')]" />
      <div className="relative max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-6 px-8 py-10">
        <div className="flex-1 text-white">
          <p className="text-sm uppercase tracking-[0.4em] text-cyan-200 font-semibold mb-4">NCLEX-RN Enrollment</p>
          <h2 className="text-3xl font-bold mb-3 leading-snug">Deploy the Registration Command Console</h2>
          <p className="text-indigo-100/80">
            Collect every document requirement upfront—no login needed. Share official information securely and let our team prepare
            your NCLEX-RN package.
          </p>
        </div>
        <div className="flex flex-col items-start gap-2">
          <Link
            href="/nclex-registration"
            className="px-8 py-4 bg-gradient-to-r from-cyan-400 to-fuchsia-500 text-slate-900 font-semibold rounded-2xl shadow-[0_15px_40px_rgba(236,72,153,0.45)] hover:scale-[1.02] transition"
          >
            Open Registration Form
          </Link>
          <Link
            href="/nclex-registration"
            target="_blank"
            className="text-sm text-cyan-100 underline underline-offset-4 hover:text-white"
            rel="noreferrer"
          >
            Shareable link (opens in new tab)
          </Link>
        </div>
      </div>
    </section>
  );
}

