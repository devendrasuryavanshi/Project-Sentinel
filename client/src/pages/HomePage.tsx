import { Link } from "react-router-dom";
import { ArrowRight, Shield } from "lucide-react";

export const HomePage = () => {
  return (
    <div className="min-h-screen bg-background flex items-center">
      <div className="w-full max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 items-center gap-10">
        <div className="space-y-8 animate-fade-in">
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white tracking-tight whitespace-nowrap">
              Project <span className="text-[#236AF2]">Sentinel</span>
            </h1>

            <p className="text-xl sm:text-2xl md:text-3xl font-semibold text-blue-400 max-w-xl">
              The most secure place you’ve ever visited.
            </p>
          </div>

          <p className="text-base sm:text-lg md:text-xl text-text-muted max-w-xl leading-relaxed">
            Every session is verified. Every device is tracked.
            <br />
            Nothing moves without being observed.
          </p>

          <div className="flex flex-wrap gap-4 pt-4">
            <Link
              to="/profile"
              className="px-8 sm:px-10 py-3 sm:py-4 rounded-lg bg-blue-600 text-white font-semibold shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
            >
              Enter Secure Zone <ArrowRight className="w-5 h-5" />
            </Link>

            <Link
              to="/admin"
              className="px-8 sm:px-10 py-3 sm:py-4 rounded-lg border border-white/20 text-white font-semibold hover:bg-[#030B2E] bg-white/5 transition-all"
            >
              Dashboard
            </Link>
          </div>
        </div>

        <div className="hidden md:flex justify-center lg:justify-end">
          <Shield className="w-48 h-48 lg:w-72 lg:h-72 text-[#236AF2]/20 drop-shadow-[0_0_40px_rgba(35,106,242,0.35)]" />
        </div>
      </div>
    </div>
  );
};
