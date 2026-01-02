import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", ...props }, ref) => {
    return (
      <div className="w-full space-y-1">
        {label && (
          <label className="text-xs font-medium text-text-muted uppercase tracking-wider font-mono">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`
            w-full bg-background border border-white/10 rounded-lg px-4 py-3 text-white 
            placeholder-gray-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50
            transition-all duration-200 font-sans
            ${error ? "border-danger/50 focus:border-danger" : ""}
            ${className}
          `}
          {...props}
        />
        {error && <p className="text-danger text-xs mt-1 font-mono">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";
