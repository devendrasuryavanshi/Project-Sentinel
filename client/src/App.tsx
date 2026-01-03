import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { Navbar } from "./components/layout/Navbar";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { ProfilePage } from "./pages/ProfilePage";

export default function App() {
  return (
    <div className="min-h-screen bg-sentinel-dark text-sentinel-text font-sans antialiased selection:bg-sentinel-accent">
      <BrowserRouter>
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/profile" element={<ProfilePage />} />
            </Route>
          </Routes>
        </main>
      </BrowserRouter>
    </div>
  );
}
