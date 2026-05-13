import Input from "../ui/Input";

export default function Step1Plot({ form, setForm, errors }) {
  const setPlot = (key, value) =>
    setForm({ ...form, plot: { ...form.plot, [key]: value } });

  const setSetback = (key, value) =>
    setForm({ ...form, setbacks: { ...form.setbacks, [key]: value } });

  const avgWidth = ((Number(form.plot.frontWidth) || 0) + (Number(form.plot.backWidth) || 0)) / 2;
  const avgLength = ((Number(form.plot.leftLength) || 0) + (Number(form.plot.rightLength) || 0)) / 2;
  const totalArea = avgWidth * avgLength;
  const buildableW = avgWidth - (Number(form.setbacks.left) || 0) - (Number(form.setbacks.right) || 0);
  const buildableL = avgLength - (Number(form.setbacks.front) || 0) - (Number(form.setbacks.back) || 0);
  const buildableArea = Math.max(0, buildableW * buildableL);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Plot dimensions</h2>
        <p className="text-sm text-slate-600 mt-1">
          Enter the four sides of your plot. Use feet or meters consistently.
        </p>
      </div>

      {/* Unit selector */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Unit</label>
        <div className="flex gap-2">
          {["feet", "meters"].map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => setPlot("unit", u)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                form.plot.unit === u
                  ? "bg-brand-500 text-white border-brand-500"
                  : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
              }`}
            >
              {u === "feet" ? "Feet (ft)" : "Meters (m)"}
            </button>
          ))}
        </div>
      </div>

      {/* Plot 4 sides */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-900 mb-1">Plot sides</h3>
        <p className="text-xs text-slate-500 mb-4">
          Front and back are the widths. Left and right are the lengths.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label={`Front width (${form.plot.unit === "feet" ? "ft" : "m"})`}
            type="number"
            min="3"
            step="0.1"
            value={form.plot.frontWidth}
            onChange={(e) => setPlot("frontWidth", e.target.value)}
            error={errors.frontWidth}
          />
          <Input
            label={`Back width (${form.plot.unit === "feet" ? "ft" : "m"})`}
            type="number"
            min="3"
            step="0.1"
            value={form.plot.backWidth}
            onChange={(e) => setPlot("backWidth", e.target.value)}
            error={errors.backWidth}
          />
          <Input
            label={`Left length (${form.plot.unit === "feet" ? "ft" : "m"})`}
            type="number"
            min="3"
            step="0.1"
            value={form.plot.leftLength}
            onChange={(e) => setPlot("leftLength", e.target.value)}
            error={errors.leftLength}
          />
          <Input
            label={`Right length (${form.plot.unit === "feet" ? "ft" : "m"})`}
            type="number"
            min="3"
            step="0.1"
            value={form.plot.rightLength}
            onChange={(e) => setPlot("rightLength", e.target.value)}
            error={errors.rightLength}
          />
        </div>
      </div>

      {/* Setbacks */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-900 mb-1">Setbacks</h3>
        <p className="text-xs text-slate-500 mb-4">
          Open space left between the building and the plot edge.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label={`Front (${form.plot.unit === "feet" ? "ft" : "m"})`}
            type="number"
            min="0"
            step="0.5"
            value={form.setbacks.front}
            onChange={(e) => setSetback("front", e.target.value)}
          />
          <Input
            label={`Back (${form.plot.unit === "feet" ? "ft" : "m"})`}
            type="number"
            min="0"
            step="0.5"
            value={form.setbacks.back}
            onChange={(e) => setSetback("back", e.target.value)}
          />
          <Input
            label={`Left (${form.plot.unit === "feet" ? "ft" : "m"})`}
            type="number"
            min="0"
            step="0.5"
            value={form.setbacks.left}
            onChange={(e) => setSetback("left", e.target.value)}
          />
          <Input
            label={`Right (${form.plot.unit === "feet" ? "ft" : "m"})`}
            type="number"
            min="0"
            step="0.5"
            value={form.setbacks.right}
            onChange={(e) => setSetback("right", e.target.value)}
          />
        </div>
      </div>

      {/* Summary */}
      {totalArea > 0 && (
        <div className="bg-brand-50 border border-brand-100 rounded-xl p-4 text-sm">
          <div className="grid grid-cols-2 gap-3 text-slate-700">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Total plot</p>
              <p className="font-semibold text-slate-900 mt-0.5">
                {totalArea.toFixed(1)} {form.plot.unit === "feet" ? "sq ft" : "m²"}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Buildable area</p>
              <p className="font-semibold text-slate-900 mt-0.5">
                {buildableArea > 0
                  ? `${buildableArea.toFixed(1)} ${form.plot.unit === "feet" ? "sq ft" : "m²"}`
                  : "Setbacks too large"}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}