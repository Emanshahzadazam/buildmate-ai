import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { projectsApi } from "../lib/projectsApi";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";

const ROOM_TYPES = [
  { value: "bedroom", label: "Bedroom" },
  { value: "bathroom", label: "Bathroom" },
  { value: "kitchen", label: "Kitchen" },
  { value: "living", label: "Living" },
  { value: "dining", label: "Dining" },
  { value: "study", label: "Study" },
];

const BUILDING_TYPES = [
  { value: "house", label: "House" },
  { value: "apartment", label: "Apartment" },
  { value: "office", label: "Office" },
  { value: "shop", label: "Shop" },
];

export default function NewProject() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    description: "",
    buildingType: "house",
    plotWidth: "",
    plotLength: "",
    floors: 1,
    rooms: ROOM_TYPES.reduce((acc, r) => ({ ...acc, [r.value]: 0 }), {}),
  });

  const set = (key, value) => setForm({ ...form, [key]: value });

  const setRoomCount = (type, value) =>
    setForm({ ...form, rooms: { ...form.rooms, [type]: Math.max(0, value) } });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) return setError("Project name is required");
    if (!form.plotWidth || !form.plotLength)
      return setError("Plot dimensions are required");

    const rooms = Object.entries(form.rooms)
      .filter(([, count]) => count > 0)
      .map(([type, count]) => ({ type, count }));

    if (rooms.length === 0) return setError("Add at least one room");

    setSubmitting(true);
    try {
      const project = await projectsApi.create({
        name: form.name,
        description: form.description,
        brief: {
          buildingType: form.buildingType,
          plotWidth: Number(form.plotWidth),
          plotLength: Number(form.plotLength),
          floors: Number(form.floors),
          rooms,
        },
      });
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create project");
    } finally {
      setSubmitting(false);
    }
  };

  const plotArea =
    form.plotWidth && form.plotLength
      ? (Number(form.plotWidth) * Number(form.plotLength)).toFixed(1)
      : null;

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold text-slate-900">New project</h1>
      <p className="mt-1 text-slate-600">
        Tell us about the building you want to design.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <section className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <h2 className="font-semibold text-slate-900">Basics</h2>
          <Input
            label="Project name"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="e.g. Main Street House"
          />
          <Input
            label="Description (optional)"
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="A note for yourself"
          />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Building type
            </label>
            <div className="grid grid-cols-4 gap-2">
              {BUILDING_TYPES.map((b) => (
                <button
                  key={b.value}
                  type="button"
                  onClick={() => set("buildingType", b.value)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    form.buildingType === b.value
                      ? "bg-brand-500 text-white border-brand-500"
                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <h2 className="font-semibold text-slate-900">Plot &amp; floors</h2>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Plot width (m)"
              type="number"
              min="3"
              step="0.1"
              value={form.plotWidth}
              onChange={(e) => set("plotWidth", e.target.value)}
              placeholder="7.6"
            />
            <Input
              label="Plot length (m)"
              type="number"
              min="3"
              step="0.1"
              value={form.plotLength}
              onChange={(e) => set("plotLength", e.target.value)}
              placeholder="15.2"
            />
          </div>
          {plotArea && (
            <p className="text-sm text-slate-600">
              Plot area: <span className="font-medium">{plotArea} m²</span>
            </p>
          )}

          <Input
            label="Number of floors"
            type="number"
            min="1"
            max="5"
            value={form.floors}
            onChange={(e) => set("floors", e.target.value)}
          />
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
          <h2 className="font-semibold text-slate-900">Rooms</h2>
          <p className="text-sm text-slate-600">How many of each?</p>

          <div className="grid grid-cols-2 gap-3">
            {ROOM_TYPES.map((r) => (
              <div
                key={r.value}
                className="flex items-center justify-between border border-slate-200 rounded-lg px-3 py-2"
              >
                <span className="text-sm text-slate-700">{r.label}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setRoomCount(r.value, form.rooms[r.value] - 1)}
                    className="h-7 w-7 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100"
                  >
                    −
                  </button>
                  <span className="w-6 text-center font-medium text-slate-900">
                    {form.rooms[r.value]}
                  </span>
                  <button
                    type="button"
                    onClick={() => setRoomCount(r.value, form.rooms[r.value] + 1)}
                    className="h-7 w-7 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex items-center gap-3">
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? "Creating..." : "Create project"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/dashboard")}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}