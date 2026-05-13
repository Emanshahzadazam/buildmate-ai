import { useState } from "react";

const CATEGORY_LABELS = {
  structure: "Structure",
  finishes: "Finishes",
  openings: "Doors & windows",
  fixtures: "Fixtures",
};

const formatPKR = (n) =>
  new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(n);

const formatNumber = (n) =>
  new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 }).format(n);

export default function CostPanel({ cost, layoutGenerated }) {
  const [showItems, setShowItems] = useState(false);

  if (!layoutGenerated) {
    return (
      <aside className="col-span-3 bg-white rounded-2xl border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-900">Cost</h2>
        <p className="text-xs text-slate-500">Estimate based on layout</p>
        <div className="mt-5 text-center text-slate-400 py-12 text-sm">
          Generate a layout to see<br />the estimated cost.
        </div>
      </aside>
    );
  }

  if (!cost) {
    return (
      <aside className="col-span-3 bg-white rounded-2xl border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-900">Cost</h2>
        <p className="text-xs text-red-600 mt-2">Cost data unavailable.</p>
      </aside>
    );
  }

  return (
    <aside className="col-span-3 bg-white rounded-2xl border border-slate-200 p-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-semibold text-slate-900">Cost estimate</h2>
          <p className="text-xs text-slate-500">PKR · approximate</p>
        </div>
      </div>

      {/* Total */}
      <div className="mt-4 rounded-xl bg-brand-50 border border-brand-100 p-4">
        <p className="text-xs uppercase tracking-wide text-brand-700 font-semibold">
          Total
        </p>
        <p className="mt-1 text-2xl font-bold text-slate-900">
          {formatPKR(cost.total)}
        </p>
      </div>

      {/* Category breakdown */}
      <div className="mt-5 space-y-3">
        {Object.entries(cost.byCategory).map(([cat, amount]) => {
          const pct = (amount / cost.total) * 100;
          return (
            <div key={cat}>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-700">
                  {CATEGORY_LABELS[cat] || cat}
                </span>
                <span className="font-medium text-slate-900">
                  {formatPKR(amount)}
                </span>
              </div>
              <div className="mt-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Toggle line items */}
      <button
        type="button"
        onClick={() => setShowItems(!showItems)}
        className="mt-5 text-sm text-brand-600 font-medium hover:underline"
      >
        {showItems ? "Hide" : "Show"} line items ({cost.items.length})
      </button>

      {showItems && (
        <div className="mt-3 border-t border-slate-200 pt-3 space-y-2 max-h-72 overflow-y-auto">
          {cost.items.map((item) => (
            <div key={item.key} className="text-xs">
              <div className="flex justify-between">
                <span className="text-slate-700">{item.label}</span>
                <span className="font-medium text-slate-900">
                  {formatPKR(item.subtotal)}
                </span>
              </div>
              <div className="text-slate-500">
                {formatNumber(item.quantity)} {item.unit} ×{" "}
                {formatPKR(item.rate)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Disclaimer */}
      <p className="mt-5 text-[11px] text-slate-500 leading-relaxed border-t border-slate-200 pt-3">
        {cost.notes?.[0] || "Estimates may vary from actual market prices."}
      </p>
    </aside>
  );
}