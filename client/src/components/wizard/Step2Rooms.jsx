import Input from "../ui/Input";

const BEDROOM_SIZES = [
  { value: "master", label: "Master" },
  { value: "medium", label: "Medium" },
  { value: "small", label: "Small" },
];

const ROOM_TYPES = [
  { key: "bedroom",  label: "Bedrooms",   hasSize: true },
  { key: "bathroom", label: "Bathrooms",  hasSize: false },
  { key: "kitchen",  label: "Kitchen",    hasSize: false, max: 2 },
  { key: "living",   label: "Living Room", hasSize: false, max: 1 },
  { key: "dining",   label: "Dining",     hasSize: false, max: 1 },
  { key: "drawing",  label: "Drawing Room", hasSize: false, max: 1 },
  { key: "study",    label: "Study",      hasSize: false, max: 2 },
  { key: "store",    label: "Store Room", hasSize: false, max: 2 },
];

export default function Step2Rooms({ form, setForm, errors }) {
  // form.roomCounts = { bedroom: 2, bathroom: 2, ... }
  // form.bedroomSizes = ["master", "medium"]   (array indexed by bedroom number)

  const setCount = (key, value) => {
    const newCount = Math.max(0, value);
    const next = { ...form, roomCounts: { ...form.roomCounts, [key]: newCount } };

    // Adjust bedroomSizes array length when bedroom count changes
    if (key === "bedroom") {
      const sizes = [...(form.bedroomSizes || [])];
      while (sizes.length < newCount) sizes.push("medium");
      while (sizes.length > newCount) sizes.pop();
      next.bedroomSizes = sizes;
    }

    setForm(next);
  };

  const setBedroomSize = (idx, size) => {
    const sizes = [...(form.bedroomSizes || [])];
    sizes[idx] = size;
    setForm({ ...form, bedroomSizes: sizes });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Rooms</h2>
        <p className="text-sm text-slate-600 mt-1">
          How many of each room do you need? Set to 0 to skip.
        </p>
      </div>

      {errors.rooms && (
        <p className="text-sm text-red-600">{errors.rooms}</p>
      )}

      {/* Room counters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ROOM_TYPES.map((r) => {
            const count = form.roomCounts?.[r.key] || 0;
            return (
              <div
                key={r.key}
                className="flex items-center justify-between border border-slate-200 rounded-lg px-3 py-2"
              >
                <span className="text-sm text-slate-700">{r.label}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCount(r.key, count - 1)}
                    className="h-7 w-7 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100"
                  >
                    −
                  </button>
                  <span className="w-6 text-center font-medium text-slate-900">
                    {count}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCount(r.key, count + 1)}
                    disabled={r.max && count >= r.max}
                    className="h-7 w-7 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bedroom sizes (only show if bedrooms > 0) */}
      {form.roomCounts?.bedroom > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900 mb-1">Bedroom sizes</h3>
          <p className="text-xs text-slate-500 mb-4">
            Pick a size for each bedroom. Master rooms get more floor space.
          </p>
          <div className="space-y-3">
            {Array.from({ length: form.roomCounts.bedroom }).map((_, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <span className="text-sm text-slate-700 w-24">Bedroom {idx + 1}</span>
                <div className="flex gap-2 flex-1">
                  {BEDROOM_SIZES.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setBedroomSize(idx, s.value)}
                      className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                        form.bedroomSizes?.[idx] === s.value
                          ? "bg-brand-500 text-white border-brand-500"
                          : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Floors */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-900 mb-3">Floors</h3>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-700">Number of floors</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setForm({ ...form, floors: Math.max(1, (form.floors || 1) - 1) })}
              className="h-7 w-7 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100"
            >
              −
            </button>
            <span className="w-6 text-center font-medium text-slate-900">
              {form.floors || 1}
            </span>
            <button
              type="button"
              onClick={() => setForm({ ...form, floors: Math.min(5, (form.floors || 1) + 1) })}
              className="h-7 w-7 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100"
            >
              +
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}