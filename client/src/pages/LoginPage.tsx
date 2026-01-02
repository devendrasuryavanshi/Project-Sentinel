import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ShieldCheck, AlertCircle } from "lucide-react";
import { useAuthStore } from "../store/authStore"; // From your previous context
import { authApi } from "../api/auth";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { OtpForm } from "../components/auth/OtpForm";

type AuthStep = "CREDENTIALS" | "OTP";

export const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();

  // State
  const [step, setStep] = useState<AuthStep>("CREDENTIALS");
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Handles the initial login form submission.
   * If risk is detected or the user is unverified, the backend will ask for an OTP.
   * If the login is successful, the user will be logged in and redirected to the profile page.
   * If there is an error, the error message will be displayed.
   * @param {React.FormEvent} e - The form submission event.
   */
  const handleInitialLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Step 1: Send Credentials
      const response: any = await authApi.login({
        email: formData.email,
        password: formData.password,
      });

      // Scenario A: Risk Detected or Unverified -> backend asks for OTP
      if (response.requireOtp) {
        setStep("OTP");
      }
      // Scenario B: Safe -> Login Successful
      else if (response.user) {
        login(response?.user); // Token handled by HttpOnly cookie
        navigate("/profile");
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Login failed. Please try again."
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
      // Step 2: Send Credentials + OTP
      const response = await authApi.login({
        email: formData.email,
        password: formData.password,
        otp: otpCode,
      });

      if (response.user) {
        login(response?.user);
        navigate("/profile");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Invalid verification code.");
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
      {/* Background Decor */}
      <div className="absolute top-[-20%] left-[-10%] w-125 h-125 bg-primary/5 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-125 h-125 bg-secondary/5 rounded-full blur-[100px]" />

      <div className="w-full max-w-md relative z-10">
        {/* Header Logo */}
        <div className="flex justify-center mb-8">
          <Link to="/" className="flex items-center gap-2 group">
            <ShieldCheck className="w-10 h-10 text-primary group-hover:scale-110 transition-transform" />
            <span className="text-2xl font-bold tracking-tight text-white">
              Sentinel<span className="text-primary">.Access</span>
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

          {step === "CREDENTIALS" ? (
            <form
              onSubmit={handleInitialLogin}
              className="space-y-5 animate-fade-in"
            >
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-white">Welcome Back</h2>
                <p className="text-text-muted text-sm">
                  Enter your credentials to access the terminal.
                </p>
              </div>

              <Input
                label="Email Address"
                type="email"
                required
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="name@company.com"
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

              <Button type="submit" isLoading={isLoading} className="mt-2">
                Initiate Sequence
              </Button>

              <div className="text-center mt-4">
                <p className="text-sm text-text-muted">
                  Don't have an account?{" "}
                  <Link
                    to="/register"
                    className="text-primary hover:underline font-medium"
                  >
                    Register access
                  </Link>
                </p>
              </div>
            </form>
          ) : (
            <OtpForm
              email={formData.email}
              isLoading={isLoading}
              onSubmit={handleOtpVerify}
              onBack={() => setStep("CREDENTIALS")}
            />
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-text-muted mt-8 font-mono opacity-50">
          SECURE CONNECTION • 256-BIT ENCRYPTION
        </p>
      </div>
    </div>
  );
};
