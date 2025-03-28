import React, { useState } from "react";
import axios from "axios";
import { Bar, Pie } from "react-chartjs-2";
import "chart.js/auto"; // Import Chart.js

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateText?key=${API_KEY}`;

const FinancialDashboard = () => {
  // State for user input
  const [userData, setUserData] = useState({
    income: "",
    expenses: "",
    savings: "",
    investments: "",
    debt: "",
  });

  // State for AI response and loading
  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState(false);
  const [chartData, setChartData] = useState(null); // Store processed AI data for charts

  // Handle input change
  const handleChange = (e) => {
    setUserData({ ...userData, [e.target.name]: e.target.value });
  };

  // Fetch AI financial analysis
  const handleAnalyze = async () => {
    setLoading(true);

    try {
      const response = await axios.post(API_URL, {
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Analyze the following financial data:
                - Income: ${userData.income}
                - Expenses: ${userData.expenses}
                - Savings: ${userData.savings}
                - Investments: ${userData.investments}
                - Debt: ${userData.debt}
                
                Provide:
                1. Insights on financial health.
                2. Recommended savings percentage.
                3. Ideal budget breakdown for expenses, savings, investments.
                4. Graph-friendly percentage breakdown.`,
              },
            ],
          },
        ],
      });

      const aiResponse = response.data.candidates[0].content.parts[0].text;
      setAnalysis(aiResponse);

      // 🔹 Simulating extracted AI budget breakdown (Replace this with AI's response parsing)
      const budgetBreakdown = {
        expenses: (userData.income * 0.5).toFixed(2),
        savings: (userData.income * 0.3).toFixed(2),
        investments: (userData.income * 0.15).toFixed(2),
        debt: (userData.income * 0.05).toFixed(2),
      };

      setChartData(budgetBreakdown);
    } catch (error) {
      console.error("Error fetching AI response:", error);
      setAnalysis("Failed to fetch insights. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h2>📊 Financial Dashboard</h2>

      {/* 🔹 User Input Form */}
      <div className="form-container">
        <label>💰 Income: </label>
        <input type="number" name="income" value={userData.income} onChange={handleChange} />

        <label>📉 Expenses: </label>
        <input type="number" name="expenses" value={userData.expenses} onChange={handleChange} />

        <label>💾 Savings: </label>
        <input type="number" name="savings" value={userData.savings} onChange={handleChange} />

        <label>📈 Investments: </label>
        <input type="number" name="investments" value={userData.investments} onChange={handleChange} />

        <label>⚠️ Debt: </label>
        <input type="number" name="debt" value={userData.debt} onChange={handleChange} />

        <button onClick={handleAnalyze} disabled={loading}>
          {loading ? "Analyzing..." : "Analyze My Finances"}
        </button>
      </div>

      {/* 🔹 AI Analysis Output */}
      {analysis && (
        <div className="analysis">
          <h3>💡 AI Insights:</h3>
          <p>{analysis}</p>
        </div>
      )}

      {/* 🔹 Graphs (Only show if we have AI data) */}
      {chartData && (
        <div className="charts">
          <h3>📊 Budget Breakdown</h3>

          {/* 🔹 Bar Chart */}
          <div className="chart">
            <Bar
              data={{
                labels: ["Expenses", "Savings", "Investments", "Debt"],
                datasets: [
                  {
                    label: "Financial Breakdown",
                    data: Object.values(chartData),
                    backgroundColor: ["red", "green", "blue", "purple"],
                  },
                ],
              }}
            />
          </div>

          {/* 🔹 Pie Chart */}
          <div className="chart">
            <Pie
              data={{
                labels: ["Expenses", "Savings", "Investments", "Debt"],
                datasets: [
                  {
                    data: Object.values(chartData),
                    backgroundColor: ["red", "green", "blue", "purple"],
                  },
                ],
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialDashboard;
