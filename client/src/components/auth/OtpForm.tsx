import { useState, useRef, useEffect, type FormEvent } from "react";
import { Button } from "../ui/Button";
import { Lock } from "lucide-react";

interface OtpFormProps {
  email: string;
  isLoading: boolean;
  onSubmit: (otp: string) => void;
  onBack: () => void;
}

export const OtpForm = ({
  email,
  isLoading,
  onSubmit,
  onBack,
}: OtpFormProps) => {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Auto-focus first input
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    if (isNaN(Number(value))) return;

    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1); // Only take last char
    setOtp(newOtp);

    // Auto-advance
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 6).split("");
    const newOtp = [...otp];
    pastedData.forEach((char, index) => {
      if (index < 6 && !isNaN(Number(char))) newOtp[index] = char;
    });
    setOtp(newOtp);
    if (pastedData.length > 0) {
      inputRefs.current[Math.min(pastedData.length, 5)]?.focus();
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(otp.join(""));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto border border-primary/20">
          <Lock className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-white">Security Verification</h2>
        <p className="text-sm text-text-muted">
          We detected a new login. Enter the code sent to <br />
          <span className="text-white font-mono">{email}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex gap-2 justify-center" onPaste={handlePaste}>
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type="text"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className="w-10 h-12 sm:w-12 sm:h-14 bg-background border border-white/10 rounded-lg text-center text-xl font-mono text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
            />
          ))}
        </div>

        <div className="space-y-3">
          <Button
            type="submit"
            isLoading={isLoading}
            disabled={otp.some((d) => !d)}
          >
            Verify Login
          </Button>
          <button
            type="button"
            onClick={onBack}
            className="w-full text-sm text-text-muted hover:text-white transition-colors"
          >
            Back to Login
          </button>
        </div>
      </form>
    </div>
  );
};
