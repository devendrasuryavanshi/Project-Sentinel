import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Shield, AlertCircle, CheckCircle2 } from "lucide-react";
import { authApi } from "../api/auth";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { OtpForm } from "../components/auth/OtpForm";
import { useAuthStore } from "../store/authStore";

type RegisterStep = "FORM" | "OTP";

export const RegisterPage = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();

  // State
  const [step, setStep] = useState<RegisterStep>("FORM");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // validatoin
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setIsLoading(true);

    try {
      // Call Backend Register Endpoint
      const response = await authApi.register({
        email: formData.email,
        password: formData.password,
      });

      // If success, backend usually sends 'requireOtp: true' for email verification
      if (response.requireOtp) {
        setStep("OTP");
      } else {
        // Fallback if backend auto-verifies (unlikely based on your logic)
        navigate("/login");
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Registration failed. Try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handles the second step of the login process, which is the OTP verification.
   * If the OTP is valid, the user will be logged in and redirected to the profile page.
   * If there is an error, the error message will be displayed.
   * @param {string} otpCode - The OTP code to verify.
   */
  const handleOtpVerify = async (otpCode: string) => {
    setError(null);
    setIsLoading(true);

    try {
      const response: any = await authApi.login({
        email: formData.email,
        password: formData.password,
        otp: otpCode,
      });

      if (response.user) {
        login(response?.user);
        navigate("/profile");
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Invalid code. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!error) return;

    const timer = setTimeout(() => {
      setError(null);
    }, 5000);

    return () => clearTimeout(timer);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background relative overflow-hidden">
      {/* Ambient Background Effects */}
      <div className="absolute top-[-20%] right-[50%] w-150 h-150 bg-primary/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-20%] left-[50%] w-125 h-125 bg-secondary/5 rounded-full blur-[100px]" />

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="flex justify-center mb-8">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="bg-white/5 p-2 rounded-lg group-hover:bg-white/10 transition-colors">
              <Shield className="w-8 h-8 text-secondary" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-white">
              Sentinel<span className="text-secondary">.Register</span>
            </span>
          </Link>
        </div>

        {/* Main Card */}
        <div className="bg-surface border border-white/10 rounded-2xl p-8 shadow-2xl backdrop-blur-sm">
          {error && (
            <div className="mb-6 bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-lg text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {step === "FORM" ? (
            <form
              onSubmit={handleRegister}
              className="space-y-5 animate-fade-in"
            >
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-white">Create Account</h2>
                <p className="text-text-muted text-sm">
                  Join the secure network.
                </p>
              </div>

              <Input
                label="Email"
                type="email"
                required
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="you@example.com"
              />

              <Input
                label="Password"
                type="password"
                required
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                placeholder="••••••••"
              />

              <Input
                label="Confirm Password"
                type="password"
                required
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData({ ...formData, confirmPassword: e.target.value })
                }
                placeholder="••••••••"
              />

              <div className="pt-2">
                <Button type="submit" isLoading={isLoading}>
                  Register Account
                </Button>
              </div>

              <div className="text-center mt-4">
                <p className="text-sm text-text-muted">
                  Already have an ID?{" "}
                  <Link
                    to="/login"
                    className="text-secondary hover:underline font-medium"
                  >
                    Login here
                  </Link>
                </p>
              </div>
            </form>
          ) : (
            <div className="space-y-6 animate-fade-in">
              {/* Success Banner before OTP */}
              <div className="bg-secondary/10 border border-secondary/20 rounded-lg p-4 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-secondary shrink-0" />
                <p className="text-sm text-secondary">
                  Account created! Please verify your email to continue.
                </p>
              </div>

              <OtpForm
                email={formData.email}
                isLoading={isLoading}
                onSubmit={handleOtpVerify}
                onBack={() => setStep("FORM")}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
