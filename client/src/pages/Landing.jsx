import { Link } from "react-router-dom";
import Button from "../components/ui/Button";

export default function Landing() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-b from-brand-50 to-white">
        <div className="max-w-6xl mx-auto px-6 py-20 md:py-28 text-center">
          <span className="inline-block px-3 py-1 rounded-full bg-brand-100 text-brand-700 text-xs font-semibold tracking-wide uppercase mb-5">
            Final Year Project · IIUI
          </span>
          <h1 className="text-4xl md:text-6xl font-bold text-slate-900 leading-tight">
            Design buildings <span className="text-brand-500">smarter,</span>
            <br className="hidden md:block" /> not harder.
          </h1>
          <p className="mt-5 max-w-2xl mx-auto text-lg text-slate-600">
            BuildMate AI generates 2D floor plans, 3D models, and live cost
            estimates from a few simple inputs — built for engineers, students,
            and homeowners.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link to="/register">
              <Button variant="primary" className="text-base px-6 py-3">
                Get started free
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="outline" className="text-base px-6 py-3">
                Log in
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900">
            Everything you need to plan a building
          </h2>
          <p className="mt-3 text-slate-600">
            From the first prompt to the final cost report.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              title: "AI-generated 2D plans",
              body: "Describe your building. Get a clean, scaled floor plan in seconds.",
            },
            {
              title: "Interactive 3D models",
              body: "Walk through your design in the browser — no extra software needed.",
            },
            {
              title: "Real cost estimation",
              body: "Material quantities and budget tied to local construction rates.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-slate-200 bg-white p-6 hover:shadow-md transition-shadow"
            >
              <div className="h-10 w-10 rounded-lg bg-brand-100 text-brand-600 flex items-center justify-center font-bold mb-4">
                ✓
              </div>
              <h3 className="font-semibold text-slate-900 text-lg">
                {f.title}
              </h3>
              <p className="mt-2 text-sm text-slate-600">{f.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}