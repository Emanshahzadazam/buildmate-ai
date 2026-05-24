import Input from "../ui/Input";

const COLUMN_GRIDS = ["10ft", "12ft", "15ft", "auto"];

export default function Step4Technical({ form, setForm }) {
  const setTech = (key, value) =>
    setForm({ ...form, technical: { ...form.technical, [key]: value } });

  const totalRooms = Object.values(form.roomCounts || {}).reduce(
    (s, n) => s + n, 0
  );
  const avgW =
    ((Number(form.plot.frontWidth) || 0) +
      (Number(form.plot.backWidth) || 0)) / 2;
  const avgL =
    ((Number(form.plot.leftLength) || 0) +
      (Number(form.plot.rightLength) || 0)) / 2;
  const buildableW = Math.max(
    0,
    avgW - (Number(form.setbacks.left) || 0) - (Number(form.setbacks.right) || 0)
  );
  const buildableL = Math.max(
    0,
    avgL - (Number(form.setbacks.front) || 0) - (Number(form.setbacks.back) || 0)
  );
  const buildableArea = buildableW * buildableL;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">
          Technical specs & Review
        </h2>
        <p className="text-sm text-slate-600 mt-1">
          Set construction parameters and review your project.
        </p>
      </div>

      {/* Technical specs */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <h3 className="font-semibold text-slate-900">Construction specs</h3>

        <Input
          label={`Floor height (${form.plot.unit === "feet" ? "ft" : "m"})`}
          type="number"
          min="8"
          max="15"
          step="0.5"
          value={form.technical?.floorHeight || 10}
          onChange={(e) => setTech("floorHeight", Number(e.target.value))}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Exterior wall thickness (inches)"
            type="number"
            min="4.5"
            max="18"
            step="0.5"
            value={form.technical?.wallThicknessExt || 9}
            onChange={(e) =>
              setTech("wallThicknessExt", Number(e.target.value))
            }
          />
          <Input
            label="Interior wall thickness (inches)"
            type="number"
            min="3"
            max="9"
            step="0.5"
            value={form.technical?.wallThicknessInt || 4.5}
            onChange={(e) =>
              setTech("wallThicknessInt", Number(e.target.value))
            }
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Column grid
          </label>
          <div className="flex gap-2 flex-wrap">
            {COLUMN_GRIDS.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setTech("columnGrid", g)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                  (form.technical?.columnGrid || "auto") === g
                    ? "bg-brand-500 text-white border-brand-500"
                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Review summary */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-900 mb-4">Review summary</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">
              Plot
            </p>
            <p className="font-medium text-slate-900">
              {form.plot.frontWidth} × {form.plot.leftLength}{" "}
              {form.plot.unit === "feet" ? "ft" : "m"}
            </p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">
              Buildable area
            </p>
            <p className="font-medium text-slate-900">
              {buildableArea > 0
                ? `${buildableArea.toFixed(1)} ${
                    form.plot.unit === "feet" ? "sq ft" : "m²"
                  }`
                : "—"}
            </p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">
              Rooms
            </p>
            <p className="font-medium text-slate-900">{totalRooms} total</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">
              Floors
            </p>
            <p className="font-medium text-slate-900">{form.floors}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">
              Kitchen
            </p>
            <p className="font-medium text-slate-900 capitalize">
              {form.kitchenType}
            </p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">
              Wall (ext / int)
            </p>
            <p className="font-medium text-slate-900">
              {form.technical?.wallThicknessExt || 9}" /{" "}
              {form.technical?.wallThicknessInt || 4.5}"
            </p>
          </div>
        </div>

        <div className="mt-4 bg-brand-50 border border-brand-100 rounded-xl p-3 text-sm text-brand-800">
          ✓ Everything looks good. Click <strong>Create project</strong> to
          generate your layout.
        </div>
      </div>
    </div>
  );
}