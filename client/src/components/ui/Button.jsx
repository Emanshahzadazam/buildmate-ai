export default function Button({
  children,
  variant = "primary",
  type = "button",
  className = "",
  ...props
}) {
  const base =
    "inline-flex items-center justify-center px-5 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary: "bg-brand-500 text-white hover:bg-brand-600",
    secondary: "bg-slate-900 text-white hover:bg-slate-700",
    outline:
      "border border-slate-300 text-slate-700 hover:bg-slate-100",
    ghost: "text-slate-700 hover:bg-slate-100",
  };

  return (
    <button
      type={type}
      className={`${base} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}