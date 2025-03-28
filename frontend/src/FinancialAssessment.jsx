import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Radar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  RadialLinearScale,
  LineElement,
  PointElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";

// Chart.js Registration
ChartJS.register(
  RadialLinearScale,
  LineElement,
  PointElement,
  Filler,
  Tooltip,
  Legend
);

const FinancialAssessment = () => {
  const navigate = useNavigate();

  // Fetch stored knowledge or set defaults
  const getStoredKnowledge = () => {
    try {
      const storedData = localStorage.getItem("financialKnowledge");
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        if (typeof parsedData === 'object' && parsedData !== null) {
          // Basic check for expected keys might be good here too if needed
          const defaultKeys = ["Budgeting", "Loans", "Investing", "Taxes", "Insurance", "Retirement"];
          const hasAllKeys = defaultKeys.every(key => key in parsedData);
          if (hasAllKeys) {
            return parsedData;
          } else {
             console.warn("Stored data missing expected keys, using defaults.");
          }
        }
      }
    } catch (error) {
      console.error("Error reading or parsing financialKnowledge from localStorage:", error);
    }
    // Default values if nothing valid in localStorage or error occurs
    return {
      Budgeting: 4,
      Loans: 5,
      Investing: 10,
      Taxes: 5,
      Insurance: 6,
      Retirement: 3,
    };
  };

  const [knowledge, setKnowledge] = useState(getStoredKnowledge);

  // Save to localStorage whenever knowledge changes
  useEffect(() => {
    try {
      localStorage.setItem("financialKnowledge", JSON.stringify(knowledge));
    } catch (error) {
      console.error("Error saving financialKnowledge to localStorage:", error);
    }
  }, [knowledge]);

  const analyzeKnowledge = () => {
    const lowAreas = Object.entries(knowledge)
      .filter(([_, score]) => score <= 3)
      .map(([area]) => area);

    const recommendationsMap = {
      Budgeting: "Explore budgeting techniques and tools.",
      Investing: "Learn the fundamentals of investing (stocks, bonds, mutual funds).",
      Taxes: "Understand basic tax filing and deductions in India.",
      Insurance: "Research different types of insurance (health, life, property).",
      Loans: "Learn about loan types, interest rates, and management.",
      Retirement: "Start planning for retirement savings (e.g., PPF, NPS).",
    };

    const suggestedResources = lowAreas.map(area => recommendationsMap[area]).filter(Boolean);

    const preferences = {
      knowledgeSnapshot: { ...knowledge },
      lowScoringAreas: lowAreas,
      suggestedFocus: suggestedResources,
      timestamp: new Date().toISOString(),
    };

    try {
      localStorage.setItem("financialPreferences", JSON.stringify(preferences));
      console.log("Financial preferences saved:", preferences);
    } catch (error) {
      console.error("Error saving financialPreferences to localStorage:", error);
      // Optionally alert the user about the save failure
      // alert("Could not save preferences. Please try again.");
      // return; // Prevent navigation if saving failed
    }

    navigate("/vid");
  };

  // --- Chart Configuration ---
  const labels = Object.keys(knowledge);
  const chartData = {
    labels: labels,
    datasets: [
      {
        label: "Your Financial Knowledge",
        data: Object.values(knowledge),
        backgroundColor: "rgba(59, 130, 246, 0.2)", // Tailwind blue-500 with alpha
        borderColor: "rgba(59, 130, 246, 1)",     // Tailwind blue-500 solid
        borderWidth: 2,
        pointBackgroundColor: "rgba(59, 130, 246, 1)", // Tailwind blue-500 solid
        pointBorderColor: "#fff",
        pointHoverBackgroundColor: "#fff",
        pointHoverBorderColor: "rgba(59, 130, 246, 1)",
      },
    ],
  };

  // Corrected chartOptions for JavaScript (no 'as const')
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        min: 0,
        max: 10,
        angleLines: {
          color: 'rgba(107, 114, 128, 0.3)', // Tailwind gray-500 with alpha
        },
        grid: {
          color: 'rgba(107, 114, 128, 0.3)', // Tailwind gray-500 with alpha
        },
        pointLabels: {
          font: {
            size: 13,
            weight: "500",
          },
          color: '#E5E7EB', // Tailwind gray-200
        },
        ticks: {
          stepSize: 2,
          backdropColor: 'transparent',
          color: '#9CA3AF', // Tailwind gray-400
          font: {
             size: 11,
          },
        },
      },
    },
    plugins: {
      legend: {
        position: "bottom", // CORRECTED: Removed 'as const'
        labels: {
          color: '#D1D5DB', // Tailwind gray-300
          font: {
            size: 14,
          },
          padding: 20,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(31, 41, 55, 0.9)', // gray-800
        titleColor: '#F3F4F6', // gray-100
        bodyColor: '#D1D5DB', // gray-300
        borderColor: 'rgba(107, 114, 128, 0.5)', // gray-500
        borderWidth: 1,
      },
    },
  };

  // --- JSX Structure ---
  return (
    <div className="bg-gray-950 min-h-screen w-full font-sans text-white py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-12 leading-tight">
          Financial Knowledge <span className="text-teal-400">Assessment</span>
        </h1>

        <div className="flex flex-col lg:flex-row lg:space-x-8 gap-8 lg:gap-0">
          {/* Sliders Section */}
          <div className="w-full lg:w-1/2 bg-gray-800/60 p-6 md:p-8 rounded-lg shadow-xl border border-gray-700/50 backdrop-blur-sm flex flex-col">
            <h2 className="text-xl font-semibold text-gray-200 mb-6 border-b border-gray-700 pb-2">Rate Your Knowledge (0-10)</h2>
            <div className="space-y-6 flex-grow">
              {labels.map((key) => (
                <div key={key}>
                  <label htmlFor={key} className="block mb-2 text-sm font-medium text-gray-300 flex justify-between">
                    <span>{key}</span>
                    <span className="text-teal-400 font-semibold">{knowledge[key]}</span>
                  </label>
                  <input
                    id={key}
                    type="range"
                    min="0"
                    max="10"
                    step="1"
                    value={knowledge[key]}
                    onChange={(e) => setKnowledge({
                      ...knowledge,
                      [key]: parseInt(e.target.value, 10),
                    })}
                    className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-teal-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-teal-400/80"
                  />
                </div>
              ))}
            </div>
            <button
              onClick={analyzeKnowledge}
              className="w-full mt-8 px-6 py-3 rounded-lg font-semibold text-white bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-teal-400 transition duration-300 ease-in-out transform hover:-translate-y-1 shadow-md hover:shadow-lg"
            >
              Save & Get Recommendations
            </button>
          </div>

          {/* Chart Section */}
          <div className="w-full lg:w-1/2 bg-gray-800/60 p-6 md:p-8 rounded-lg shadow-xl border border-gray-700/50 backdrop-blur-sm flex flex-col items-center justify-center">
             <h2 className="text-xl font-semibold text-gray-200 mb-4 text-center">Your Knowledge Profile</h2>
             <div className="relative w-full h-80 sm:h-96 md:h-[450px] lg:h-[500px]">
                 <Radar data={chartData} options={chartOptions} />
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default FinancialAssessment;