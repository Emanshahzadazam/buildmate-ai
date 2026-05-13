export default function StepIndicator({ steps, currentStep }) {
  return (
    <div className="flex items-center justify-between mb-8">
      {steps.map((step, idx) => {
        const stepNum = idx + 1;
        const isActive = stepNum === currentStep;
        const isComplete = stepNum < currentStep;
        return (
          <div key={step} className="flex items-center flex-1">
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm transition-colors ${
                  isComplete
                    ? "bg-brand-500 text-white"
                    : isActive
                    ? "bg-brand-100 text-brand-700 ring-2 ring-brand-500"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {isComplete ? "✓" : stepNum}
              </div>
              <span
                className={`text-sm font-medium ${
                  isActive ? "text-slate-900" : "text-slate-500"
                }`}
              >
                {step}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div
                className={`flex-1 h-px mx-4 ${
                  isComplete ? "bg-brand-500" : "bg-slate-200"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}