export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white mt-auto">
      <div className="max-w-6xl mx-auto px-6 py-8 text-sm text-slate-500 flex flex-col md:flex-row items-center justify-between gap-4">
        <p>© {new Date().getFullYear()} BuildMate AI. Final Year Project, IIUI.</p>
        <p>Built by Eman Shahzad, Zaina Azam, Eman Niaz</p>
      </div>
    </footer>
  );
}