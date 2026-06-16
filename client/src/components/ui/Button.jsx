export default function Button({
  children,
  variant = "primary",
  type = "button",
  className = "",
  ...props
}) {
  const base =
    "inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full font-bold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden";

  const variants = {
    primary:
      "bg-gradient-to-br from-[#1a252f] to-[#0f1419] text-white shadow-lg hover:-translate-y-0.5 hover:shadow-xl",
    secondary:
      "bg-gradient-to-br from-[#1E88E5] to-[#00BCD4] text-white shadow-lg hover:-translate-y-0.5 hover:shadow-xl",
    outline:
      "border border-white/40 bg-white/60 backdrop-blur text-[#546E7A] hover:bg-white/80 hover:text-[#1a252f]",
    ghost: "text-[#546E7A] hover:bg-white/60 hover:text-[#1a252f]",
    danger:
      "bg-red-500/10 border border-red-300/40 text-red-600 hover:bg-red-500/20",
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