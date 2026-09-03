import { useState } from "react";
import { Eye, EyeOff, LogIn, Mail, Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import loginBg from "@/assets/login-bg.jpg";
import logo from "@/assets/logo.png";
import { API } from "@/apiConfig";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const result = await login(email, password);
    if (result.success) {
      navigate("/dashboard/products");
    } else {
      setError(result.error || "Invalid email or password");
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center md:justify-end bg-cover bg-center p-4 relative"
      style={{ backgroundImage: `url(${loginBg})` }}
    >
      {/* Logo in left upper corner - increased size */}
      <div className="absolute top-6 left-6 md:top-10 md:left-10">
        <img
          src={logo}
          alt="Golden Asia Logo"
          className="w-24 h-24 md:w-32 md:h-32 object-contain"
        />
      </div>

      <div className="w-full max-w-md md:mr-16 lg:mr-32 animate-fade-in">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-gray-100">
          {/* Logo inside the form */}
          <div className="flex justify-center mb-2">
            <img
              src={logo}
              alt="Golden Asia Logo"
              className="w-32 h-32 md:w-36 md:h-36 object-contain"
            />
          </div>
          {/* Login Title */}
          <h3 className="text-xl font-semibold text-gray-800 mb-3 text-center">
            Login
          </h3>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg text-center border border-red-200">
                {error}
              </div>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition"
                  placeholder="example@gmail.com"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition"
                  placeholder="Enter password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Forgot Password & Remember Me */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                />
                <label
                  htmlFor="remember"
                  className="ml-2 text-sm text-gray-600"
                >
                  Remember Me
                </label>
              </div>
              <a
                href="#"
                onClick={() => navigate("/forgot-password")}
                className="text-sm text-amber-600 hover:text-amber-700 hover:underline"
              >
                Forgot Password?
              </a>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              className="w-full py-3 rounded-lg bg-amber-600 text-white font-semibold flex items-center justify-center gap-2 hover:bg-amber-700 transition-colors shadow-lg mt-8"
            >
              <LogIn size={18} />
              LOGIN
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
