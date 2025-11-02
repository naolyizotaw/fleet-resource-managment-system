import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Truck, BarChart3, Wrench, Fuel, Calendar, FileText } from 'lucide-react';

const Landing = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef(null);
  const features = [
    {
      icon: <Truck className="h-10 w-10 stroke-[2.5]" />,
      title: 'Vehicle Management',
      description: 'Manage your entire fleet with real-time tracking and comprehensive vehicle information.',
    },
    {
      icon: <Fuel className="h-10 w-10 stroke-[2.5]" />,
      title: 'Fuel Requests',
      description: 'Streamline fuel requests and approvals for efficient fuel management.',
    },
    {
      icon: <Wrench className="h-10 w-10 stroke-[2.5]" />,
      title: 'Maintenance Tracking',
      description: 'Schedule and track vehicle maintenance to ensure optimal performance.',
    },
    {
      icon: <Calendar className="h-10 w-10 stroke-[2.5]" />,
      title: 'Per Diem Management',
      description: 'Easy tracking and approval of per diem expenses for your team.',
    },
    {
      icon: <FileText className="h-10 w-10 stroke-[2.5]" />,
      title: 'Detailed Logs',
      description: 'Comprehensive logging system for all fleet activities and transactions.',
    },
    {
      icon: <BarChart3 className="h-10 w-10 stroke-[2.5]" />,
      title: 'Reports & Analytics',
      description: 'Generate insights with powerful reporting and analytics tools.',
    },
  ];

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, []);

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
          <div className="absolute inset-0 bg-gradient-to-r from-gray-900/85 via-gray-800/75 to-gray-900/85" />
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="relative z-50 bg-black/40 backdrop-blur-sm shadow-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-primary-600">
                <Truck className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">FleetPro</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/login"
                className="text-white hover:text-primary-300 font-medium transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/login"
                className="btn-primary"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 min-h-screen flex items-center py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Content */}
            <div>
              <div className="mb-6 flex items-center gap-3">
                <div className="h-px w-12 bg-primary-600"></div>
                <span className="text-sm text-primary-400 uppercase tracking-widest font-bold">Fleet Management</span>
              </div>
              
              <h1 className="text-6xl md:text-7xl lg:text-8xl font-black text-white mb-6 leading-none">
                DRIVE YOUR
                <span className="block mt-2 bg-gradient-to-r from-primary-400 via-primary-500 to-primary-600 bg-clip-text text-transparent">
                  FLEET FORWARD
                </span>
              </h1>
              
              <p className="text-xl text-gray-300 mb-10 leading-relaxed max-w-xl">
                Complete ecosystem for modern fleet operations. Real-time tracking, 
                intelligent analytics, and seamless management—all in one platform.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <Link
                  to="/login"
                  className="group relative px-8 py-4 bg-primary-600 text-white font-bold uppercase tracking-wide overflow-hidden transition-all hover:bg-primary-700"
                >
                  <span className="relative z-10">Get Started</span>
                  <div className="absolute inset-0 bg-white/10 translate-x-full group-hover:translate-x-0 transition-transform duration-300"></div>
                </Link>
                <a
                  href="#features"
                  className="px-8 py-4 border-2 border-white/30 text-white font-bold uppercase tracking-wide hover:bg-white/10 hover:border-white/50 transition-all text-center"
                >
                  Explore Features
                </a>
              </div>

              <div className="flex items-center gap-8 text-white/60 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>24/7 Support</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span>99% Uptime</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                  <span>Cloud-Based</span>
                </div>
              </div>
            </div>

            {/* Right Content - Key Benefits */}
            <div className="space-y-5">
              <div className="group relative bg-gradient-to-br from-black/70 to-black/50 backdrop-blur-md border-l-[3px] border-primary-600 p-8 hover:from-black/80 hover:to-black/60 transition-all cursor-pointer overflow-hidden">
                <div className="absolute top-0 left-0 w-0 h-1 bg-primary-600 group-hover:w-full transition-all duration-500"></div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary-600/5 rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-500"></div>
                <div className="relative flex items-start gap-5">
                  <div className="text-primary-400 text-4xl font-black leading-none">01</div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-black text-white mb-3 uppercase tracking-wider group-hover:text-primary-400 transition-colors">Complete Control</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">Manage every aspect of your fleet from a single, powerful dashboard with real-time updates</p>
                  </div>
                </div>
              </div>

              <div className="group relative bg-gradient-to-br from-black/70 to-black/50 backdrop-blur-md border-l-[3px] border-primary-600 p-8 hover:from-black/80 hover:to-black/60 transition-all cursor-pointer overflow-hidden ml-10">
                <div className="absolute top-0 left-0 w-0 h-1 bg-primary-600 group-hover:w-full transition-all duration-500"></div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary-600/5 rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-500"></div>
                <div className="relative flex items-start gap-5">
                  <div className="text-primary-400 text-4xl font-black leading-none">02</div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-black text-white mb-3 uppercase tracking-wider group-hover:text-primary-400 transition-colors">Cost Savings</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">Reduce operational costs by up to 30% with intelligent optimization and automation</p>
                  </div>
                </div>
              </div>

              <div className="group relative bg-gradient-to-br from-black/70 to-black/50 backdrop-blur-md border-l-[3px] border-primary-600 p-8 hover:from-black/80 hover:to-black/60 transition-all cursor-pointer overflow-hidden">
                <div className="absolute top-0 left-0 w-0 h-1 bg-primary-600 group-hover:w-full transition-all duration-500"></div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary-600/5 rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-500"></div>
                <div className="relative flex items-start gap-5">
                  <div className="text-primary-400 text-4xl font-black leading-none">03</div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-black text-white mb-3 uppercase tracking-wider group-hover:text-primary-400 transition-colors">Real-Time Insights</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">Make data-driven decisions with live analytics, reporting, and predictive intelligence</p>
                  </div>
                </div>
              </div>

              <div className="group relative bg-gradient-to-br from-black/70 to-black/50 backdrop-blur-md border-l-[3px] border-primary-600 p-8 hover:from-black/80 hover:to-black/60 transition-all cursor-pointer overflow-hidden ml-10">
                <div className="absolute top-0 left-0 w-0 h-1 bg-primary-600 group-hover:w-full transition-all duration-500"></div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary-600/5 rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-500"></div>
                <div className="relative flex items-start gap-5">
                  <div className="text-primary-400 text-4xl font-black leading-none">04</div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-black text-white mb-3 uppercase tracking-wider group-hover:text-primary-400 transition-colors">24/7 Support</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">Expert assistance whenever you need it, around the clock with dedicated support team</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Language Selector */}
          <div className="absolute bottom-8 right-8 flex items-center gap-2 text-white/60 text-sm">
            <button className="px-3 py-1 hover:text-white transition-colors">EN</button>
            <span>/</span>
            <button className="px-3 py-1 hover:text-white transition-colors">AR</button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section ref={sectionRef} id="features" className="relative z-10 py-32 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`mb-20 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-1 h-16 bg-primary-600"></div>
              <h2 className="text-5xl md:text-6xl font-bold text-white uppercase tracking-tight">
                Everything You Need
              </h2>
            </div>
            <p className="text-xl text-gray-300 max-w-3xl ml-6">
              Complete technology ecosystem for fleet management. Built for efficiency, designed for scale.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className={`group relative bg-black/30 backdrop-blur-sm border border-white/10 p-8 hover:border-primary-600/50 transition-all duration-500 ${
                  isVisible 
                    ? 'opacity-100 translate-y-0' 
                    : 'opacity-0 translate-y-12'
                }`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div className="absolute top-0 left-0 w-0 h-1 bg-primary-600 group-hover:w-full transition-all duration-500"></div>
                <div className="flex items-center gap-5 mb-6">
                  <div className="text-primary-600 group-hover:text-white transition-colors duration-300 group-hover:scale-110 transform">
                    {feature.icon}
                  </div>
                  <h3 className="text-2xl font-bold text-white uppercase tracking-wide">
                    {feature.title}
                  </h3>
                </div>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="relative z-10 py-24 border-y border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-16">
            <div className="flex-1 text-center group cursor-pointer">
              <div className="inline-block relative">
                <div className="text-7xl md:text-8xl font-black bg-gradient-to-br from-primary-400 to-primary-600 bg-clip-text text-transparent mb-4 group-hover:scale-110 transition-transform duration-300">
                  99%
                </div>
                <div className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary-600 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
              <div className="text-xl font-bold text-white uppercase tracking-widest mb-2">Uptime</div>
              <div className="text-gray-400 text-sm">Reliable & Always Available</div>
            </div>

            <div className="hidden md:block w-px h-32 bg-gradient-to-b from-transparent via-white/20 to-transparent"></div>
            
            <div className="flex-1 text-center group cursor-pointer">
              <div className="inline-block relative">
                <div className="text-7xl md:text-8xl font-black bg-gradient-to-br from-primary-400 to-primary-600 bg-clip-text text-transparent mb-4 group-hover:scale-110 transition-transform duration-300">
                  24/7
                </div>
                <div className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary-600 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
              <div className="text-xl font-bold text-white uppercase tracking-widest mb-2">Support</div>
              <div className="text-gray-400 text-sm">Round-the-Clock Assistance</div>
            </div>

            <div className="hidden md:block w-px h-32 bg-gradient-to-b from-transparent via-white/20 to-transparent"></div>
            
            <div className="flex-1 text-center group cursor-pointer">
              <div className="inline-block relative">
                <div className="text-7xl md:text-8xl font-black bg-gradient-to-br from-primary-400 to-primary-600 bg-clip-text text-transparent mb-4 group-hover:scale-110 transition-transform duration-300">
                  100+
                </div>
                <div className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary-600 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
              <div className="text-xl font-bold text-white uppercase tracking-widest mb-2">Features</div>
              <div className="text-gray-400 text-sm">Everything You Need</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-32 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Side - Text Content */}
            <div>
              <div className="flex items-center gap-3 mb-8">
                <div className="h-px w-16 bg-primary-600"></div>
                <span className="text-sm text-primary-400 uppercase tracking-widest font-bold">Join Us Today</span>
              </div>
              
              <h2 className="text-5xl md:text-6xl lg:text-7xl font-black text-white mb-6 uppercase leading-tight">
                Start Your
                <span className="block bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
                  Journey
                </span>
              </h2>
              
              <p className="text-xl text-gray-300 mb-10 leading-relaxed">
                Trusted by <span className="text-primary-400 font-bold">thousands of fleet managers</span> worldwide to streamline operations and maximize efficiency.
              </p>

              <div className="flex items-center gap-6 mb-10">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-white text-sm font-semibold">Active Platform</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-white text-sm font-semibold">Secure & Reliable</span>
                </div>
              </div>

              <Link
                to="/login"
                className="group inline-flex items-center gap-3 px-10 py-5 bg-primary-600 text-white font-bold text-lg uppercase tracking-wide hover:bg-primary-700 transition-all hover:gap-5"
              >
                <span>Get Started Now</span>
                <span className="text-2xl group-hover:translate-x-1 transition-transform">→</span>
              </Link>
            </div>

            {/* Right Side - Highlights */}
            <div className="space-y-5">
              <div className="bg-black/50 backdrop-blur-sm border-l-4 border-primary-600 p-6 hover:bg-black/60 transition-all">
                <div className="flex items-center gap-4">
                  <div className="text-primary-400 text-4xl font-black">✓</div>
                  <div className="text-left">
                    <div className="text-white font-bold text-lg uppercase">Instant Access</div>
                    <div className="text-gray-400 text-sm">Set up your account in minutes</div>
                  </div>
                </div>
              </div>

              <div className="bg-black/50 backdrop-blur-sm border-l-4 border-primary-600 p-6 hover:bg-black/60 transition-all ml-8">
                <div className="flex items-center gap-4">
                  <div className="text-primary-400 text-4xl font-black">✓</div>
                  <div className="text-left">
                    <div className="text-white font-bold text-lg uppercase">Full Features</div>
                    <div className="text-gray-400 text-sm">Access all premium capabilities</div>
                  </div>
                </div>
              </div>

              <div className="bg-black/50 backdrop-blur-sm border-l-4 border-primary-600 p-6 hover:bg-black/60 transition-all">
                <div className="flex items-center gap-4">
                  <div className="text-primary-400 text-4xl font-black">✓</div>
                  <div className="text-left">
                    <div className="text-white font-bold text-lg uppercase">Expert Support</div>
                    <div className="text-gray-400 text-sm">Dedicated team ready to help</div>
                  </div>
                </div>
              </div>

              <div className="bg-black/50 backdrop-blur-sm border-l-4 border-primary-600 p-6 hover:bg-black/60 transition-all ml-8">
                <div className="flex items-center gap-4">
                  <div className="text-primary-400 text-4xl font-black">✓</div>
                  <div className="text-left">
                    <div className="text-white font-bold text-lg uppercase">No Commitments</div>
                    <div className="text-gray-400 text-sm">Cancel anytime, no questions asked</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 bg-black/60 backdrop-blur-md border-t border-white/20 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-12 mb-16">
            {/* Brand Column */}
            <div className="md:col-span-2">
              <div className="flex items-center space-x-3 mb-6">
                <div className="h-12 w-12 flex items-center justify-center bg-primary-600">
                  <Truck className="h-7 w-7 text-white" />
                </div>
                <span className="text-3xl font-black text-white tracking-tight">FleetPro</span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed mb-6 max-w-sm">
                The most complete technology ecosystem for fleet management in the world. Built for efficiency, designed for scale.
              </p>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white/10 hover:bg-primary-600 flex items-center justify-center cursor-pointer transition-colors border border-white/20">
                  <span className="text-sm font-bold">f</span>
                </div>
                <div className="w-10 h-10 bg-white/10 hover:bg-primary-600 flex items-center justify-center cursor-pointer transition-colors border border-white/20">
                  <span className="text-sm font-bold">in</span>
                </div>
                <div className="w-10 h-10 bg-white/10 hover:bg-primary-600 flex items-center justify-center cursor-pointer transition-colors border border-white/20">
                  <span className="text-sm font-bold">X</span>
                </div>
              </div>
            </div>

            {/* Links Columns */}
            <div>
              <h4 className="font-black text-white mb-6 uppercase tracking-widest text-sm">Solutions</h4>
              <ul className="space-y-3 text-gray-400 text-sm">
                <li><a href="#features" className="hover:text-primary-400 transition-colors hover:translate-x-1 inline-block">Features</a></li>
                <li><button className="hover:text-primary-400 transition-colors hover:translate-x-1 inline-block">Pricing</button></li>
                <li><button className="hover:text-primary-400 transition-colors hover:translate-x-1 inline-block">Security</button></li>
                <li><button className="hover:text-primary-400 transition-colors hover:translate-x-1 inline-block">Integration</button></li>
              </ul>
            </div>

            <div>
              <h4 className="font-black text-white mb-6 uppercase tracking-widest text-sm">Company</h4>
              <ul className="space-y-3 text-gray-400 text-sm">
                <li><button className="hover:text-primary-400 transition-colors hover:translate-x-1 inline-block">About Us</button></li>
                <li><button className="hover:text-primary-400 transition-colors hover:translate-x-1 inline-block">Contact</button></li>
                <li><button className="hover:text-primary-400 transition-colors hover:translate-x-1 inline-block">Careers</button></li>
                <li><button className="hover:text-primary-400 transition-colors hover:translate-x-1 inline-block">Blog</button></li>
              </ul>
            </div>

            <div>
              <h4 className="font-black text-white mb-6 uppercase tracking-widest text-sm">Resources</h4>
              <ul className="space-y-3 text-gray-400 text-sm">
                <li><button className="hover:text-primary-400 transition-colors hover:translate-x-1 inline-block">Help Center</button></li>
                <li><button className="hover:text-primary-400 transition-colors hover:translate-x-1 inline-block">Documentation</button></li>
                <li><button className="hover:text-primary-400 transition-colors hover:translate-x-1 inline-block">API Reference</button></li>
                <li><button className="hover:text-primary-400 transition-colors hover:translate-x-1 inline-block">Status</button></li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 text-sm">
              &copy; 2025 <span className="text-white font-bold">FleetPro</span>. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-sm text-gray-400">
              <button className="hover:text-white transition-colors">Privacy Policy</button>
              <button className="hover:text-white transition-colors">Terms of Service</button>
              <button className="hover:text-white transition-colors">Cookie Policy</button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;

