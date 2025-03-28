import React, { useState, useEffect } from 'react';
// Using react-icons for this theme
import { Link } from 'react-router-dom';
import { FaRobot, FaGraduationCap, FaRupeeSign, FaUserPlus, FaGamepad, FaQuoteLeft, FaCheckCircle, FaBullseye, FaChartLine } from 'react-icons/fa';
import { FiArrowUpRight, FiTrendingUp } from 'react-icons/fi'; // For buttons and icons

// --- Interactive Animation Component for Rupee ---
const InteractiveRupee = ({ delay = 0, size = 'text-lg' }) => {
  const floatDuration = 2 + Math.random() * 4; // Faster movement (was 8 + Math.random() * 12)
  const animationDelay = delay;

  return (
    <FaRupeeSign
      className={`absolute animate-float ${size} text-teal-500/40`}
      style={{
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        animationDelay: `${animationDelay}s`,
        animationDuration: `${floatDuration}s`,
        opacity: 0.6,
        filter: 'drop-shadow(0 0 2px #5eead4)'
      }}
    />
  );
};

// --- Main Landing Page Component ---
const FinancialLiteracyPlatform = () => {
  const numRupees = 20; // Number of background rupees

  return (
    // Root container setup for scrolling
    <div className="bg-gray-950 min-h-screen w-full font-sans text-white flex flex-col">
      {/* Global Styles with Tailwind's @apply to ensure animation works */}
      <style jsx global>{`
        @keyframes float {
          0% { transform: translate(0, 0); }
          25% { transform: translate(10px, -15px); }
          50% { transform: translate(0, -30px); }
          75% { transform: translate(-10px, -15px); }
          100% { transform: translate(0, 0); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite; /* Faster base animation (was 6s) */
          animation-fill-mode: forwards;
        }
        .btn {
          transition: all 0.3s ease;
          box-shadow: 0 4px 14px rgba(0,0,0,0.2);
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.1);
          backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          font-weight: 500;
          border-radius: 0.5rem;
          padding: 0.75rem 1.5rem;
          color: white;
          position: relative;
          overflow: hidden;
        }
        .btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0,0,0,0.25);
        }
        .btn:before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(120deg, rgba(255,255,255,0) 30%, rgba(255,255,255,0.2), rgba(255,255,255,0) 70%);
          transform: translateX(-100%);
        }
        .btn:hover:before {
          transform: translateX(100%);
          transition: all 0.8s ease;
        }
        .btn-primary {
          background: linear-gradient(90deg, #3ACFD5 0%, #3a77cf 100%);
          color: white;
        }
        .btn-secondary {
          background: linear-gradient(90deg, #e879f9 0%, #c084fc 100%);
          color: white;
        }
        .btn-tertiary {
          background: linear-gradient(90deg, #f87171 0%, #fb923c 100%);
          color: white;
        }
      `}</style>

      {/* Header (Can be made sticky if needed, but default scroll for now) */}
     

       {/* Main Content Wrapper - Full width */}
       <div className="flex-grow relative w-full">
          {/* Hero Section - Full width */}
          <main id="home" className="relative z-10 flex flex-col items-center justify-center text-center w-full min-h-screen py-0 overflow-hidden">
            {/* Background Animation Container - Full width */}
            <div className="absolute inset-0 z-0 opacity-80 pointer-events-none w-full h-full">
                {Array.from({ length: numRupees }).map((_, i) => (
                <InteractiveRupee key={`rupee-${i}`} delay={i * 0.2} size={i % 3 === 0 ? 'text-3xl' : 'text-2xl'} />
                ))}
                <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/60"></div>
            </div>

            {/* Hero Content - Full width */}
            <div className="relative z-10 w-full h-full flex flex-col justify-center items-center px-2">
                <div className="inline-block bg-blue-500/10 border border-blue-400/30 text-blue-300 px-6 py-2 rounded-full text-sm sm:text-base mb-8 backdrop-blur-sm">
                    <FaRobot className="inline-block mr-2" />
                    Meet Your AI-Powered Finance Planner!
                </div>

                <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 leading-tight w-full px-4">
                Master Your Money, <span className="text-teal-400">Secure India's Future</span>
                </h1>
                <p className="text-gray-400 w-full mb-12 text-base md:text-lg lg:text-xl px-4 max-w-4xl">
                Accessible financial literacy for everyone in India. Learn, plan, and grow your wealth with personalized guidance and AI-driven insights.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12 w-full px-4 max-w-3xl mx-auto">
                    <Link to="/inp" className="btn btn-primary inline-flex items-center justify-center min-w-[200px] text-base py-3">
                        <FaGraduationCap className="text-lg" />
                        <span>Chat now</span>
                    </Link>
                    <Link to="http://localhost:8501/" className="btn btn-secondary inline-flex items-center justify-center min-w-[200px] text-base py-3">
                        <FaRobot className="text-lg" />
                        <span>Analyse your contract</span>
                        <FiArrowUpRight className="text-xs ml-1" />
                    </Link>
                    <Link to="/fin" className="btn btn-tertiary inline-flex items-center justify-center min-w-[200px] text-base py-3">
                        <FaGamepad className="text-lg" />
                        <span>Financial Education</span>
                    </Link>
                    <Link to="http://localhost:8502/" className="btn btn-primary inline-flex items-center justify-center min-w-[200px] text-base py-3">
                        <FaChartLine className="text-lg" />
                        <span>Explore Games</span>
                        <FiTrendingUp className="text-xs ml-1" />
                    </Link>
                </div>
            </div>
          </main>

        
       </div> 

     

    </div> 
  );
};

export default FinancialLiteracyPlatform;