import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  variant?: "primary" | "outline" | "danger";
}

export const Button = ({
  children,
  isLoading,
  variant = "primary",
  className = "",
  disabled,
  ...props
}: ButtonProps) => {
  const variants = {
    primary:
      "bg-primary hover:bg-blue-600 text-white shadow-lg shadow-blue-500/20",
    outline:
      "bg-transparent border border-white/10 hover:bg-white/5 text-text-muted hover:text-white",
    danger:
      "bg-danger/10 text-danger border border-danger/20 hover:bg-danger/20",
  };

  return (
    <button
      disabled={isLoading || disabled}
      className={`
        w-full py-3 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]}
        ${className}
      `}
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
};
