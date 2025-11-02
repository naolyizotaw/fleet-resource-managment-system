import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, Truck } from 'lucide-react';

const Login = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await login(formData.username, formData.password);
      if (result.success) {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative">
      {/* Background Image with Overlay */}
      <div className="fixed inset-0 z-0">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-fixed"
          style={{
            backgroundImage: 'url(/images/truck2.jpg)',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-black/92 via-black/88 to-black/92" />
        </div>
      </div>

      {/* Back to Home Link */}
      <div className="relative z-10 pt-8 px-8">
        <Link to="/" className="inline-flex items-center gap-2 text-white/70 hover:text-primary-400 transition-colors group">
          <span className="text-2xl group-hover:-translate-x-1 transition-transform">←</span>
          <span className="uppercase tracking-widest text-xs font-bold">Home</span>
        </Link>
      </div>

      {/* Login Section */}
      <div className="relative z-10 min-h-screen flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-16 items-center">
          
          {/* Left Side - Branding */}
          <div className="hidden lg:block">
            <div className="flex items-center gap-4 mb-8">
              <div className="h-px w-20 bg-primary-600"></div>
              <span className="text-sm text-primary-400 uppercase tracking-widest font-bold">Welcome Back</span>
            </div>
            
            <h1 className="text-6xl md:text-7xl font-black text-white mb-6 uppercase leading-none">
              Fleet
              <span className="block text-primary-400">Management</span>
            </h1>
            
            <p className="text-xl text-gray-300 mb-10 leading-relaxed max-w-lg">
              Access your dashboard and manage your fleet operations with real-time insights and control.
            </p>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-white text-sm font-semibold">Secure & Encrypted</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-white text-sm font-semibold">24/7 Available</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div>
                <span className="text-white text-sm font-semibold">Real-time Updates</span>
              </div>
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="max-w-md w-full mx-auto">
            <div className="relative bg-gradient-to-br from-black/80 to-black/60 backdrop-blur-xl border-l-4 border-primary-600 p-12 overflow-hidden">
              <div className="absolute top-0 left-0 w-0 h-1 bg-primary-600 animate-pulse" style={{ width: '100%' }}></div>
              
              {/* Logo for mobile */}
              <div className="lg:hidden text-center mb-8">
                <div className="inline-flex items-center gap-3">
                  <div className="h-12 w-12 bg-primary-600 flex items-center justify-center">
                    <Truck className="h-7 w-7 text-white" />
                  </div>
                  <span className="text-3xl font-black text-white">FleetPro</span>
                </div>
              </div>

              <div className="mb-10">
                <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tight">
                  Sign In
                </h2>
                <p className="text-gray-400 text-sm">
                  Enter your credentials to continue
                </p>
              </div>
              
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div>
                  <label htmlFor="username" className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                    Username
                  </label>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    value={formData.username}
                    onChange={handleChange}
                    className="w-full px-5 py-4 bg-black/50 border-b-2 border-white/20 text-white placeholder-gray-600 focus:outline-none focus:border-primary-600 transition-all text-lg"
                    placeholder="Enter username"
                  />
                </div>
                
                <div>
                  <label htmlFor="password" className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={formData.password}
                      onChange={handleChange}
                      className="w-full px-5 py-4 bg-black/50 border-b-2 border-white/20 text-white placeholder-gray-600 focus:outline-none focus:border-primary-600 transition-all pr-12 text-lg"
                      placeholder="Enter password"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-2 flex items-center text-gray-500 hover:text-primary-400 transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="group relative w-full px-8 py-5 bg-primary-600 text-white font-black text-lg uppercase tracking-widest overflow-hidden transition-all hover:bg-primary-700 hover:shadow-2xl hover:shadow-primary-600/50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-3">
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <span>Sign In</span>
                          <span className="text-xl group-hover:translate-x-1 transition-transform">→</span>
                        </>
                      )}
                    </span>
                    <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                  </button>
                </div>

                <div className="text-center pt-6 border-t border-white/10">
                  <p className="text-sm text-gray-500">
                    Need access?{' '}
                    <Link to="/register" className="font-bold text-primary-400 hover:text-primary-300 transition-colors">
                      Contact Admin
                    </Link>
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
