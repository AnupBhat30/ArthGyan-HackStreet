import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import insurancePolicies from "./insuranceData";
import { Pie, Bar, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title
} from "chart.js";
import ReactMarkdown from 'react-markdown';
import { FiSend, FiTrash2, FiBarChart2, FiTrendingUp, FiPieChart, FiMic } from 'react-icons/fi';
import { FaRupeeSign } from 'react-icons/fa';

// Register Chart.js components
ChartJS.register(
  ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title
);

// --- SECURITY WARNING ---
const GEMINI_API_KEY = " "; // Replace with your actual key loaded securely

function Chatbot() {
  const [financialData, setFinancialData] = useState({});
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // --- Data Fetching and Saving ---
  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("financialData")) || {};
    setFinancialData(data);
    const history = JSON.parse(localStorage.getItem("chatHistory")) || [];
    setMessages(history);

    // Add welcome message if there are no existing messages
    if (history.length === 0) {
      const welcomeMessage = {
        sender: "bot",
        message: `### 👋 Welcome to FinPal!

I'm here to help you manage your finances better. Feel free to ask me anything!`,
        timestamp: new Date().toISOString()
      };
      saveChatMessage(welcomeMessage.message, "bot");
      setMessages([welcomeMessage]);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const saveChatMessage = (message, sender) => {
    const newMessage = { sender, message, timestamp: new Date().toISOString() };
    const currentHistory = JSON.parse(localStorage.getItem("chatHistory")) || [];
    const updatedHistory = [...currentHistory, newMessage].slice(-50); // Keep last 50 messages
    localStorage.setItem("chatHistory", JSON.stringify(updatedHistory));
    return newMessage;
  };

  // --- Gemini API Interaction ---
  const getGeminiResponse = async (query) => {
    setIsLoading(true);
    const relevantHistory = messages.slice(-6); // Last 3 user/bot pairs

    // Enhanced Prompt - keeping the structure but adapting tone/style if needed
    const prompt = `
     You are "FinPal India", a friendly AI financial advisor specializing in personal finance for users in India. Your goal is to provide personalized, actionable financial advice based on the user's data and recent conversation history. Use Indian Rupees (₹) for all monetary values. Assume the user's financial data is in INR.

Insurance Policies
${JSON.stringify(insurancePolicies, null, 2)}

User's Financial Data (INR):
${JSON.stringify(financialData, null, 2)}

Recent Chat History:
${JSON.stringify(relevantHistory, null, 2)}

User's Current Query: "${query}"

Based on the above, provide a concise, encouraging response in Markdown. Use this structure for clarity and readability:

Analysis
Brief summary of the user's situation tied to their query, using key data points (e.g., income, expenses). Keep it 1-2 sentences.
Recommendations
Short, actionable suggestion 1 (e.g., specific Indian options like PPF, NPS, ELSS, FD, RD, or insurance from above if relevant) with a brief reason.
Short, actionable suggestion 2 (consider tax-saving options like Section 80C if applicable).
Optional third suggestion if critical.
Next Step
One practical action (e.g., "Check SIP options on Groww") or a quick clarifying question.
Guidelines:

Keep it short and to the point—avoid long explanations.
Use ₹ before all monetary values.
Maintain a friendly, positive tone.
Suggest insurance policies from the Insurance Policies list only when the query explicitly mentions "insurance" (e.g., "Compare insurance policies," "What insurance should I get?") or when insurance is directly relevant (e.g., "How do I protect my family financially?"). Otherwise, focus on general financial options like PPF, NPS, ELSS, FD, or RD.
Proactive Enhancement: Proactively suggest actions based on user data (e.g., budgeting tips if expenses exceed income) and use predictive analytics to forecast financial health (e.g., “At this rate, you’ll save ₹X in Y years”). Emphasize data privacy and security to reassure users.
Goal-Related Queries: For queries about financial goals (e.g., "When will I reach my goals?"), include a section titled **Goal Timeline (Estimates)** with bullet points using predictive analytics to estimate timelines based on financial data, distinct from insurance responses.
Example Response (Non-Insurance Query):

Analysis
Your ₹50,000 monthly income and ₹15,000 housing costs leave room to save, per your query on saving more.
Recommendations
Save ₹5,000 monthly in a Recurring Deposit (RD) for steady growth.
Start a ₹2,000 SIP in an ELSS Mutual Fund for tax benefits under Section 80C.
Next Step
Explore RD options with your bank this week.
Example Response (Insurance Query):

Analysis
Your ₹50,000 monthly income and ₹15,000 housing costs allow for insurance, per your query on insurance options.
Recommendations
LIC Term Plan: ₹600/month for ₹1 crore cover. Affordable life protection.
Star Health Family Floater: ₹1,200/month for ₹10 lakh cover. Great for family needs.
Start a ₹2,000 SIP in ELSS for tax benefits under Section 80C.
Next Step
Get a Star Health quote on Policybazaar.
Example Response (Goal-Related Query):

Analysis
Your ₹300,000 monthly income and low savings rate mean reaching goals like education, emergency funds, and a car depends on boosting savings.
Goal Timeline (Estimates)
Education Fund (₹47,140): Save ₹47,140 in ~1 year with ₹4,000/month.
Emergency Fund (₹90,000 - ₹180,000): Reach in 3-6 months with ₹30,000/month.
First Car Purchase (e.g., ₹5,00,000): Save ₹50,000/month for ~10 months.
Recommendations
Allocate ₹50,000/month across goals, starting with an ELSS SIP for tax savings and growth.
Open a PPF account with ₹10,000/month for secure, long-term gains.
Next Step
Create a budget to free up ₹50,000/month and check ELSS options on Groww.
Disclaimer: I'm an AI, not a financial expert. Consult a professional for tailored advice.
      `;

    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, // Using 1.5 Flash
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.6, topP: 0.9 }, // Slightly adjusted config
          safetySettings: [ // Example Safety Settings
             { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
             { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
             { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
             { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
           ]
        },
        { headers: { "Content-Type": "application/json" } }
      );

      const text = response?.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        return text.trim();
      } else {
        console.error("Unexpected Gemini API response structure:", response.data);
         // Check for blocked content
        if (response?.data?.promptFeedback?.blockReason) {
             return `Sorry, your request could not be processed due to safety concerns (${response.data.promptFeedback.blockReason}). Please rephrase your query.`;
         }
        return "Sorry, I received an unexpected response. Please try again.";
      }
    } catch (error) {
      console.error("Error calling Gemini API:", error.response?.data || error.message);
      let errorMessage = "Sorry, I couldn't process that right now. ";
      if (error.response?.status === 400) {
        errorMessage += `There might be an issue with the request format or content safety filters (${error.response?.data?.error?.message || 'Bad Request'}).`;
      } else if (error.response?.status === 429) {
        errorMessage += "Too many requests. Please wait a moment and try again.";
      } else {
        errorMessage += "Please check the console for details and try again later.";
      }
      return errorMessage;
    } finally {
      setIsLoading(false);
    }
  };

  // --- Event Handlers ---
  const handleSendMessage = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    const userMessage = saveChatMessage(trimmedInput, "user");
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    if (Object.keys(financialData).length === 0 && messages.length < 10) { // Limit the no-data message
      const botMessage = saveChatMessage(
        "I don't have your financial data yet. Please submit your details first to get personalized advice!",
        "bot"
      );
      setMessages((prev) => [...prev, botMessage]);
      // Don't return here if you still want the bot to try and answer generic questions
      // return;
    }

    // Proceed to get response even without data, bot might handle generic queries
    const botResponse = await getGeminiResponse(trimmedInput);
    const botMessage = saveChatMessage(botResponse, "bot");
    setMessages((prev) => [...prev, botMessage]);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleDeleteAllData = () => {
    if (window.confirm("Are you sure you want to delete all your financial data and chat history? This action cannot be undone.")) {
      localStorage.removeItem("financialData");
      localStorage.removeItem("chatHistory");
      setFinancialData({});
      setMessages([]);
      // Add a notification message after deletion
      setTimeout(() => { // Use timeout to ensure state update completes
      setMessages([{ sender: 'bot', message: 'All financial data and chat history have been deleted.', timestamp: new Date().toISOString() }]);
      }, 0);
    }
  };

  // --- Chart Configuration ---
  const formatIndianCurrency = (value) => {
    return `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  };

  const calculateTotalExpenses = () => {
    // Get all expense fields from the financial data
    const expenseFields = Object.entries(financialData)
      .filter(([key]) => {
        // Include both main expense categories and sub-expenses
        const isExpense = ['expense', 'cost', 'payment', 'emi', 'rent', 'mortgage', 'electricity', 
          'water', 'internet', 'carEmi', 'fuel', 'maintenance', 'publicTransport', 'groceries', 
          'diningOut', 'snacks', 'healthInsurance', 'medicines', 'checkups', 'streaming', 
          'socialActivities', 'hobbies', 'familyActivities', 'tuitionFees', 'booksSupplies', 
          'courseMaterials', 'otherEducation', 'schoolFees', 'tuition', 'activities', 
          'creditCards', 'personalLoans', 'otherDebts', 'flights', 'accommodation', 
          'religious', 'socialCauses', 'otherDonations'].some(term => 
            key.toLowerCase().includes(term)
          );
        return isExpense;
      })
      .reduce((acc, [_, value]) => acc + (Number(value) || 0), 0);
    
    return expenseFields;
  };

  const calculateTotalSavings = () => {
    return Object.entries(financialData)
      .filter(([key]) => ['saving', 'investment', 'fund'].some(term => key.toLowerCase().includes(term)))
      .reduce((acc, [_, value]) => acc + (Number(value) || 0), 0);
  };

  // Calculate monthly savings trend
  const calculateSavingsTrend = () => {
    const savings = calculateTotalSavings();
    if (savings <= 0) return [0, 0, 0, 0, 0, 0];

    // Get current month (0-11)
    const currentMonth = new Date().getMonth();
    
    // Generate labels for the last 6 months
    const monthLabels = Array.from({ length: 6 }, (_, i) => {
      const month = new Date();
      month.setMonth(currentMonth - (5 - i));
      return month.toLocaleString('default', { month: 'short' });
    });

    // Calculate savings trend based on actual savings
    const monthlySavings = savings / 6; // Distribute total savings across 6 months
    const trendData = Array.from({ length: 6 }, (_, i) => {
      const progress = (i + 1) / 6;
      return Math.round(savings * progress);
    });

    return {
      labels: monthLabels,
      data: trendData
    };
  };

  const totalIncome = Number(financialData.monthlyIncome) || 0;
  const totalExpenses = calculateTotalExpenses();
  const totalSavings = calculateTotalSavings();
  const remainingIncome = Math.max(0, totalIncome - totalExpenses - totalSavings);

  // Chart Data (Use defaults or 0 if no data)
  const incomeDistributionData = {
    labels: ['Expenses', 'Savings', 'Remaining'],
    datasets: [{
        data: [
        totalExpenses || 0,
        totalSavings || 0,
        Math.max(0, (totalIncome || 0) - (totalExpenses || 0) - (totalSavings || 0)) || (totalIncome > 0 ? 0 : 1)
      ],
      backgroundColor: [
        'rgba(239, 68, 68, 0.8)',  // Red for expenses
        'rgba(59, 130, 246, 0.8)', // Blue for savings
        'rgba(16, 185, 129, 0.8)'  // Green for remaining
      ],
      borderColor: [
        'rgba(239, 68, 68, 1)',
        'rgba(59, 130, 246, 1)',
        'rgba(16, 185, 129, 1)'
      ],
        borderWidth: 2,
      hoverOffset: 15,
      hoverBorderWidth: 3,
      hoverBorderColor: [
        'rgba(239, 68, 68, 1)',
        'rgba(59, 130, 246, 1)',
        'rgba(16, 185, 129, 1)'
      ],
      hoverBackgroundColor: [
        'rgba(239, 68, 68, 0.9)',
        'rgba(59, 130, 246, 0.9)',
        'rgba(16, 185, 129, 0.9)'
      ]
    }]
  };

  // Prepare expenses data including sub-expenses
  const prepareExpensesData = () => {
    const expenseData = [];
    const expenseLabels = [];

    // Define expense categories and their sub-expenses
    const expenseCategories = {
      "Housing & Utilities": ["rent", "mortgage", "electricity", "water", "internet"],
      "Transportation": ["carEmi", "fuel", "maintenance", "publicTransport"],
      "Food & Groceries": ["groceries", "diningOut", "snacks"],
      "Healthcare": ["healthInsurance", "medicines", "checkups"],
      "Entertainment": ["streaming", "socialActivities", "hobbies", "familyActivities"],
      "Education": ["tuitionFees", "booksSupplies", "courseMaterials", "otherEducation", "schoolFees", "tuition", "activities"],
      "Debt Payments": ["creditCards", "personalLoans", "otherDebts"],
      "Travel": ["flights", "accommodation", "activities"],
      "Charitable": ["religious", "socialCauses", "otherDonations"]
    };

    // Process each category and its sub-expenses
    Object.entries(expenseCategories).forEach(([category, subExpenses]) => {
      let categoryTotal = 0;
      
      // First, process sub-expenses
      subExpenses.forEach(subExpense => {
        const value = Number(financialData[subExpense]) || 0;
        if (value > 0) {
          expenseData.push(value);
          expenseLabels.push(`${category} - ${subExpense.replace(/([A-Z])/g, ' $1').trim()}`);
          categoryTotal += value;
        }
      });

      // Then add the category total if there are any sub-expenses with values
      if (categoryTotal > 0) {
        expenseData.push(categoryTotal);
        expenseLabels.push(category);
      }
    });

    // If no expenses found, return default data
    if (expenseData.length === 0) {
      return {
        labels: ['No Expenses Data'],
        datasets: [{
          label: 'Amount (₹)',
          data: [0],
          backgroundColor: 'rgba(255, 99, 132, 0.7)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 1
        }]
      };
    }

    return {
      labels: expenseLabels,
      datasets: [{
        label: 'Amount (₹)',
        data: expenseData,
        backgroundColor: 'rgba(255, 99, 132, 0.7)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1
      }]
    };
  };

  const expensesData = prepareExpensesData();

  // Update savings trend data to use actual data
  const savingsTrend = calculateSavingsTrend();
  const savingsTrendData = {
    labels: savingsTrend.labels,
    datasets: [{
      label: 'Savings Balance (₹)',
      data: savingsTrend.data,
      fill: true,
      backgroundColor: 'rgba(75, 192, 192, 0.2)',
      borderColor: 'rgba(75, 192, 192, 1)',
      tension: 0.3
    }]
  };

  // Chart Options (Modernized)
  const commonChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#e5e7eb',
          padding: 15,
          font: { family: 'Inter, sans-serif', size: 12 }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#e5e7eb',
        bodyColor: '#d1d5db',
        padding: 10,
        titleFont: { family: 'Inter, sans-serif', weight: 'bold', size: 13 },
        bodyFont: { family: 'Inter, sans-serif', size: 12 },
        callbacks: {
          label: (context) => context.raw > 0 ? `${context.label}: ${formatIndianCurrency(context.raw)}` : `${context.label}: No Data`
        },
        cornerRadius: 4,
        displayColors: false,
      },
      title: { display: false }
    },
    scales: {
      x: {
        ticks: { 
          color: '#6b7280',
          maxRotation: 45,
          minRotation: 45
        },
        grid: { display: false }
      },
      y: {
        ticks: { 
          color: '#6b7280',
          callback: (value) => formatIndianCurrency(value)
        },
        grid: { color: '#e5e7eb', borderDash: [3, 3] }
      }
    }
  };

  const pieChartOptions = {
    ...commonChartOptions,
    scales: {},
    plugins: {
      ...commonChartOptions.plugins,
      legend: {
        ...commonChartOptions.plugins.legend,
        labels: {
          ...commonChartOptions.plugins.legend.labels,
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 20,
          font: { size: 12 }
        }
      }
    },
    cutout: '60%',
    rotation: -45,
    animation: {
      animateScale: true,
      animateRotate: true,
      duration: 1000,
      easing: 'easeInOutQuart'
    },
    layout: {
      padding: {
        top: 20,
        bottom: 20
      }
    }
  };

  const barChartOptions = { ...commonChartOptions };
  const lineChartOptions = { ...commonChartOptions };

  // --- JSX Rendering ---
  return (
    // Main container with dark gradient background
    <div className="flex w-screen h-screen p-4 md:p-6 gap-6 md:gap-8 font-sans text-gray-100 bg-gradient-to-br from-gray-950 via-black to-gray-900 overflow-hidden">
      {/* Left Side: Chatbot */}
      <div className="w-1/2 h-full flex flex-col bg-gray-900/80 backdrop-blur-xl border border-teal-500/20 rounded-2xl shadow-[0_0_25px_rgba(45,212,191,0.15)] overflow-hidden">
        <h2 className="text-xl font-semibold p-4 border-b border-teal-500/20 text-teal-300 flex-shrink-0 bg-gray-900/90 backdrop-blur-sm">
          FinPal
        </h2>

        {/* Chat Messages Area */}
        <div className="flex-grow overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-teal-500/20 scrollbar-track-transparent">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-2xl shadow-lg backdrop-blur-sm ${
                  msg.sender === "user"
                    ? "bg-teal-500/10 text-teal-100 border border-teal-500/30 rounded-br-none shadow-[0_0_15px_rgba(45,212,191,0.15)]"
                    : "bg-gray-800/80 text-gray-100 border border-gray-700/50 rounded-bl-none shadow-[0_0_15px_rgba(0,0,0,0.2)]"
                }`}
              >
                <ReactMarkdown
                  components={{
                    p: ({node, ...props}) => <p className="mb-1 last:mb-0" {...props} />,
                    ul: ({node, ...props}) => <ul className="list-disc list-inside ml-4 my-1" {...props} />,
                    ol: ({node, ...props}) => <ol className="list-decimal list-inside ml-4 my-1" {...props} />,
                    strong: ({node, ...props}) => <strong className="font-semibold text-teal-300" {...props} />,
                    h3: ({node, ...props}) => <h3 className="text-md font-semibold mt-2 mb-1 text-teal-300" {...props} />,
                  }}
                >
                    {msg.message}
                </ReactMarkdown>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-[80%] p-3 rounded-2xl shadow-lg bg-gray-800/80 text-gray-300 border border-gray-700/50 rounded-bl-none backdrop-blur-sm italic">
                FinPal is thinking...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-teal-500/20 bg-gray-900/90 backdrop-blur-sm flex items-center gap-3 flex-shrink-0">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask FinPal India..."
            className="flex-grow p-2.5 bg-gray-800/80 border border-gray-700/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/50 resize-none text-sm placeholder-gray-500 text-gray-100"
            rows={1}
            style={{ minHeight: '44px', maxHeight: '120px' }}
          />
          <button
            onClick={handleSendMessage}
            disabled={isLoading || !input.trim()}
            className={`p-2.5 bg-teal-500/10 text-teal-300 rounded-xl hover:bg-teal-500/20 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-teal-500/50 border border-teal-500/30 backdrop-blur-sm shadow-[0_0_15px_rgba(45,212,191,0.15)]`}
            aria-label="Send message"
          >
            <FiSend className="w-5 h-5" />
          </button>
          <button
            onClick={handleDeleteAllData}
            title="Delete all data and chat history"
            className="p-2.5 bg-red-500/10 text-red-300 rounded-xl hover:bg-red-500/20 transition duration-200 focus:outline-none focus:ring-2 focus:ring-red-500/50 border border-red-500/30 backdrop-blur-sm shadow-[0_0_15px_rgba(239,68,68,0.15)]"
            aria-label="Delete all data"
          >
            <FiTrash2 className="w-5 h-5"/>
          </button>
        </div>
      </div>

      {/* Right Side: Financial Analytics */}
      <div className="w-1/2 h-full flex flex-col bg-gray-900/80 backdrop-blur-xl border border-teal-500/20 rounded-2xl shadow-[0_0_25px_rgba(45,212,191,0.15)] overflow-hidden">
        <h2 className="text-xl font-semibold p-4 border-b border-teal-500/20 text-teal-300 flex-shrink-0 bg-gray-900/90 backdrop-blur-sm">
          Financial Analytics
        </h2>

        {/* Analytics Content Area */}
        <div className="p-4 flex-grow space-y-6 overflow-y-auto scrollbar-thin scrollbar-thumb-teal-500/20 scrollbar-track-transparent">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-teal-500/5 to-blue-500/5 backdrop-blur-sm p-4 rounded-xl border border-teal-500/20 shadow-lg hover:shadow-[0_0_20px_rgba(45,212,191,0.2)] transition-all duration-300">
              <div className="flex items-center text-sm text-teal-300 mb-1">
                <FaRupeeSign className="w-4 h-4 mr-2 text-teal-400"/> Monthly Income
              </div>
              <div className="text-2xl font-semibold text-teal-200">
                {formatIndianCurrency(totalIncome)}
              </div>
            </div>
            <div className="bg-gradient-to-br from-red-500/5 to-rose-500/5 backdrop-blur-sm p-4 rounded-xl border border-red-500/20 shadow-lg hover:shadow-[0_0_20px_rgba(239,68,68,0.2)] transition-all duration-300">
              <div className="flex items-center text-sm text-red-300 mb-1">
                <FiTrendingUp className="w-4 h-4 mr-2 text-red-400" style={{ transform: 'scaleY(-1)' }}/> Total Expenses
              </div>
              <div className="text-2xl font-semibold text-red-200">
                {formatIndianCurrency(totalExpenses)}
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-500/5 to-indigo-500/5 backdrop-blur-sm p-4 rounded-xl border border-blue-500/20 shadow-lg hover:shadow-[0_0_20px_rgba(59,130,246,0.2)] transition-all duration-300">
              <div className="flex items-center text-sm text-blue-300 mb-1">
                <FiPieChart className="w-4 h-4 mr-2 text-blue-400"/> Total Savings
              </div>
              <div className="text-2xl font-semibold text-blue-200">
                {formatIndianCurrency(totalSavings)}
              </div>
            </div>
            <div className="bg-gradient-to-br from-purple-500/5 to-violet-500/5 backdrop-blur-sm p-4 rounded-xl border border-purple-500/20 shadow-lg hover:shadow-[0_0_20px_rgba(168,85,247,0.2)] transition-all duration-300">
              <div className="flex items-center text-sm text-purple-300 mb-1">
                <FiBarChart2 className="w-4 h-4 mr-2 text-purple-400"/> Remaining
              </div>
              <div className="text-2xl font-semibold text-purple-200">
                {formatIndianCurrency(remainingIncome)}
              </div>
            </div>
          </div>

          {/* Charts Containers */}
          <div className="bg-gradient-to-br from-teal-500/5 to-blue-500/5 backdrop-blur-sm p-4 rounded-xl border border-teal-500/20 shadow-lg">
            <h3 className="text-md font-semibold mb-3 text-teal-200">
              Income Distribution {Object.keys(financialData).length === 0 && '(No Data)'}
            </h3>
            <div className="h-[220px]">
              <Pie data={incomeDistributionData} options={pieChartOptions} />
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-500/5 to-rose-500/5 backdrop-blur-sm p-4 rounded-xl border border-red-500/20 shadow-lg">
            <h3 className="text-md font-semibold mb-3 text-red-200">
              Monthly Expenses Breakdown {Object.keys(financialData).length === 0 && '(No Data)'}
            </h3>
            <div className="h-[220px]">
              <Bar data={expensesData} options={barChartOptions} />
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-500/5 to-indigo-500/5 backdrop-blur-sm p-4 rounded-xl border border-blue-500/20 shadow-lg">
            <h3 className="text-md font-semibold mb-3 text-blue-200">
              Savings Trend {Object.keys(financialData).length === 0 ? '(Example)' : '(Example)'}
            </h3>
            <div className="h-[220px]">
              <Line data={savingsTrendData} options={lineChartOptions} />
            </div>
          </div>

          {/* Conditional Message if No Data */}
          {Object.keys(financialData).length === 0 && (
            <div className="text-center text-teal-300 py-6 bg-gradient-to-br from-teal-500/5 to-blue-500/5 rounded-xl border border-teal-500/20">
              <FiPieChart className="w-10 h-10 mx-auto mb-3 text-teal-400" />
              <p>No financial data submitted yet.</p>
              <p className="text-sm">Charts are showing default or zero values.</p>
            </div>
            )}
         </div>
      </div>
      <MicrophoneButton />
    </div>
  );
}

// Add the microphone button component
function MicrophoneButton() {
  return (
    <a
      href="http://localhost:8000/" 
      className="fixed bottom-6 right-6 p-3 bg-teal-500/10 text-teal-300 rounded-full hover:bg-teal-500/20 transition duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500/50 border border-teal-500/30 backdrop-blur-sm shadow-[0_0_15px_rgba(45,212,191,0.15)] z-50"
      aria-label="Voice input"
    >
      <FiMic className="w-6 h-6" />
    </a>
  );
}

export default Chatbot;