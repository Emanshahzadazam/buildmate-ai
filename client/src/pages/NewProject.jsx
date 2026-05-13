import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { projectsApi } from "../lib/projectsApi";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import StepIndicator from "../components/wizard/StepIndicator";
import Step1Plot from "../components/wizard/Step1Plot";
import Step2Rooms from "../components/wizard/Step2Rooms";

const STEPS = ["Plot & Setbacks", "Rooms", "Style", "Technical"];

const initialForm = {
  name: "",
  description: "",
  plot: {
    frontWidth: "",
    backWidth: "",
    leftLength: "",
    rightLength: "",
    unit: "feet",
  },
  setbacks: { front: 4, back: 2, left: 1, right: 1 },
  floors: 1,
  roomCounts: {
    bedroom: 2,
    bathroom: 2,
    kitchen: 1,
    living: 1,
    dining: 1,
    drawing: 0,
    study: 0,
    store: 0,
  },
  bedroomSizes: ["master", "medium"],
};

export default function NewProject() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const validateStep1 = () => {
    const e = {};
    ["frontWidth", "backWidth", "leftLength", "rightLength"].forEach((k) => {
      const v = Number(form.plot[k]);
      if (!v || v < 3) e[k] = "Min 3";
      if (v > 200) e[k] = "Max 200";
    });
    return e;
  };

  const validateStep2 = () => {
    const e = {};
    const total = Object.values(form.roomCounts).reduce((s, n) => s + n, 0);
    if (total === 0) e.rooms = "Add at least one room";
    return e;
  };

  const goNext = () => {
    let stepErrors = {};
    if (currentStep === 1) stepErrors = validateStep1();
    if (currentStep === 2) stepErrors = validateStep2();

    if (Object.keys(stepErrors).length) {
      setErrors(stepErrors);
      return;
    }
    setErrors({});
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const goBack = () => {
    setErrors({});
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setSubmitError("Please give the project a name");
      return;
    }

    // Build the brief object matching backend schema
    const rooms = [];
    Object.entries(form.roomCounts).forEach(([type, count]) => {
      if (count <= 0) return;
      if (type === "bedroom") {
        // Group bedrooms by size — backend BriefRoom has type+count+size
        const grouped = {};
        (form.bedroomSizes || []).slice(0, count).forEach((s) => {
          grouped[s] = (grouped[s] || 0) + 1;
        });
        Object.entries(grouped).forEach(([size, cnt]) => {
          rooms.push({ type: "bedroom", count: cnt, size });
        });
      } else {
        rooms.push({ type, count });
      }
    });

    const payload = {
      name: form.name,
      description: form.description,
      brief: {
        buildingType: "house",
        plot: {
          frontWidth: Number(form.plot.frontWidth),
          backWidth: Number(form.plot.backWidth),
          leftLength: Number(form.plot.leftLength),
          rightLength: Number(form.plot.rightLength),
          unit: form.plot.unit,
        },
        setbacks: {
          front: Number(form.setbacks.front),
          back: Number(form.setbacks.back),
          left: Number(form.setbacks.left),
          right: Number(form.setbacks.right),
        },
        floors: Number(form.floors),
        rooms,
        // Defaults for Step 3 & 4 (will be set in next session)
        kitchenType: "closed",
        drawingRoomType: form.roomCounts.drawing > 0 ? "closed" : "none",
        hasStaircase: form.floors > 1,
        staircaseType: form.floors > 1 ? "straight" : "none",
        hasGarage: false,
        hasStoreRoom: (form.roomCounts.store || 0) > 0,
        connectivity: {
          kitchenDining: "connected",
          bathroom: "mixed",
          drawingRoom: "connected-to-lounge",
          bedroomNear: "any",
        },
        technical: {
          floorHeight: 10,
          wallThicknessExt: 9,
          wallThicknessInt: 4.5,
          columnGrid: "auto",
        },
      },
    };

    setSubmitting(true);
    setSubmitError("");
    try {
      await projectsApi.create(payload);
      navigate("/dashboard");
    } catch (err) {
      setSubmitError(err.response?.data?.message || "Failed to create project");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold text-slate-900">New project</h1>
      <p className="mt-1 text-slate-600 mb-8">
        Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1]}
      </p>

      <StepIndicator steps={STEPS} currentStep={currentStep} />

      {/* Project name on every step */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6">
        <Input
          label="Project name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="e.g. Main Street House"
        />
      </div>

      {/* Current step */}
      <div className="min-h-[400px]">
        {currentStep === 1 && <Step1Plot form={form} setForm={setForm} errors={errors} />}
        {currentStep === 2 && <Step2Rooms form={form} setForm={setForm} errors={errors} />}
        {currentStep === 3 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-sm text-slate-700">
            <p className="font-semibold mb-1">Step 3 — Style & Connectivity</p>
            <p>Coming next session. For now, using sensible defaults.</p>
            <p className="mt-3 text-xs text-slate-500">
              Click <strong>Next</strong> to continue, or <strong>Back</strong> to revise.
            </p>
          </div>
        )}
        {currentStep === 4 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-sm text-slate-700">
            <p className="font-semibold mb-1">Step 4 — Technical & Review</p>
            <p>Coming next session. For now, using sensible defaults.</p>
            <p className="mt-3 text-xs text-slate-500">
              Click <strong>Create project</strong> to save with current values.
            </p>
          </div>
        )}
      </div>

      {submitError && (
        <p className="mt-4 text-sm text-red-600">{submitError}</p>
      )}

      {/* Navigation */}
      <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-6">
        <Button
          variant="outline"
          onClick={currentStep === 1 ? () => navigate("/dashboard") : goBack}
        >
          {currentStep === 1 ? "Cancel" : "← Back"}
        </Button>
        <Button variant="primary" onClick={goNext} disabled={submitting}>
          {currentStep === STEPS.length
            ? (submitting ? "Creating..." : "Create project")
            : "Next →"}
        </Button>
      </div>
    </div>
  );
}