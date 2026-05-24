const KITCHEN_TYPES = [
  { value: "open", label: "Open Kitchen", desc: "Connected to living/dining" },
  { value: "closed", label: "Closed Kitchen", desc: "Separate enclosed space" },
];

const DRAWING_TYPES = [
  { value: "closed", label: "Closed", desc: "Separate room with door" },
  { value: "open", label: "Open", desc: "Open to main area" },
  { value: "none", label: "None", desc: "No drawing room" },
];

const CONNECTIVITY = [
  {
    key: "kitchenDining",
    label: "Kitchen & Dining",
    options: [
      { value: "connected", label: "Connected" },
      { value: "separate", label: "Separate" },
    ],
  },
  {
    key: "bathroom",
    label: "Bathrooms",
    options: [
      { value: "attached", label: "All attached" },
      { value: "common", label: "All common" },
      { value: "mixed", label: "Mixed" },
    ],
  },
  {
    key: "drawingRoom",
    label: "Drawing Room",
    options: [
      { value: "separate-entrance", label: "Separate entrance" },
      { value: "connected-to-lounge", label: "Connected to lounge" },
    ],
  },
  {
    key: "bedroomNear",
    label: "Bedrooms near",
    options: [
      { value: "any", label: "Any" },
      { value: "living-room", label: "Living room" },
      { value: "kitchen", label: "Kitchen" },
    ],
  },
];

export default function Step3Style({ form, setForm }) {
  const set = (key, value) => setForm({ ...form, [key]: value });
  const setConn = (key, value) =>
    setForm({ ...form, connectivity: { ...form.connectivity, [key]: value } });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Style & Connectivity</h2>
        <p className="text-sm text-slate-600 mt-1">
          How should rooms connect and flow into each other?
        </p>
      </div>

      {/* Kitchen type */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-900 mb-3">Kitchen style</h3>
        <div className="grid grid-cols-2 gap-3">
          {KITCHEN_TYPES.map((k) => (
            <button
              key={k.value}
              type="button"
              onClick={() => set("kitchenType", k.value)}
              className={`p-3 rounded-xl border text-left transition-colors ${
                form.kitchenType === k.value
                  ? "border-brand-500 bg-brand-50"
                  : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              <p className="font-medium text-sm text-slate-900">{k.label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{k.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Drawing room type */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-900 mb-3">Drawing room</h3>
        <div className="grid grid-cols-3 gap-3">
          {DRAWING_TYPES.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => set("drawingRoomType", d.value)}
              className={`p-3 rounded-xl border text-left transition-colors ${
                form.drawingRoomType === d.value
                  ? "border-brand-500 bg-brand-50"
                  : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              <p className="font-medium text-sm text-slate-900">{d.label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{d.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Staircase */}
      {form.floors > 1 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900 mb-3">Staircase type</h3>
          <div className="grid grid-cols-3 gap-3">
            {["straight", "L-shape", "U-shape"].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setForm({ ...form, staircaseType: s })}
                className={`p-3 rounded-xl border text-center text-sm font-medium transition-colors ${
                  form.staircaseType === s
                    ? "border-brand-500 bg-brand-50 text-brand-700"
                    : "border-slate-200 hover:bg-slate-50 text-slate-700"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Connectivity */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-900 mb-4">
          Adjacency rules
        </h3>
        <div className="space-y-4">
          {CONNECTIVITY.map((c) => (
            <div key={c.key}>
              <p className="text-sm font-medium text-slate-700 mb-2">
                {c.label}
              </p>
              <div className="flex gap-2 flex-wrap">
                {c.options.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setConn(c.key, opt.value)}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                      form.connectivity?.[c.key] === opt.value
                        ? "bg-brand-500 text-white border-brand-500"
                        : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Extras */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-900 mb-3">Extras</h3>
        <div className="space-y-3">
          {[
            { key: "hasGarage", label: "Garage" },
            { key: "hasStoreRoom", label: "Store room" },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between">
              <span className="text-sm text-slate-700">{item.label}</span>
              <button
                type="button"
                onClick={() => setForm({ ...form, [item.key]: !form[item.key] })}
                className={`w-11 h-6 rounded-full transition-colors relative ${
                  form[item.key] ? "bg-brand-500" : "bg-slate-200"
                }`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    form[item.key] ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}