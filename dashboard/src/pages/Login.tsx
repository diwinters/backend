import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] flex flex-col items-center justify-center px-4">
      {/* Floating window container - macOS style */}
      <div className="w-full max-w-[380px]">
        {/* Window */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl shadow-black/10 border border-white/50 overflow-hidden">
          {/* Window Title Bar */}
          <div className="h-12 bg-gradient-to-b from-[#e8e8ea] to-[#d8d8da] border-b border-[#c5c5c7] flex items-center justify-center relative">
            {/* Traffic lights */}
            <div className="absolute left-4 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#ff5f57] border border-[#e14640]" />
              <div className="w-3 h-3 rounded-full bg-[#febc2e] border border-[#dfa123]" />
              <div className="w-3 h-3 rounded-full bg-[#28c840] border border-[#1aab29]" />
            </div>
            <span className="text-[13px] font-medium text-[#4d4d4d]">Sign in to Raceef</span>
          </div>

          {/* Content */}
          <div className="p-8">
            {/* Logo */}
            <div className="flex flex-col items-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-b from-[#007aff] to-[#0055d4] rounded-[22px] shadow-lg shadow-blue-500/30 flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
                </svg>
              </div>
              <h1 className="text-xl font-semibold text-[#1d1d1f]">Raceef Admin</h1>
              <p className="text-[13px] text-[#86868b] mt-1">Manage your city operations</p>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-6 p-3 bg-[#ff3b30]/10 border border-[#ff3b30]/20 rounded-xl">
                <p className="text-[13px] text-[#ff3b30] text-center">{error}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="admin@raceef.com"
                  className="w-full h-11 px-4 bg-white border border-[#d2d2d7] rounded-xl text-[15px] text-[#1d1d1f] placeholder-[#86868b]
                    focus:outline-none focus:ring-4 focus:ring-[#007aff]/20 focus:border-[#007aff]
                    transition-all duration-200"
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="w-full h-11 px-4 pr-12 bg-white border border-[#d2d2d7] rounded-xl text-[15px] text-[#1d1d1f] placeholder-[#86868b]
                      focus:outline-none focus:ring-4 focus:ring-[#007aff]/20 focus:border-[#007aff]
                      transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#86868b] hover:text-[#1d1d1f] transition-colors"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 bg-[#007aff] hover:bg-[#0066d6] active:bg-[#0055b3] text-white font-medium rounded-xl
                  shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30
                  focus:outline-none focus:ring-4 focus:ring-[#007aff]/30
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all duration-200 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[12px] text-[#86868b] mt-6">
          Raceef Platform • Admin Console
        </p>
      </div>
    </div>
  );
}
