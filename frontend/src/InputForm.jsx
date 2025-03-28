import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";

// Helper function to get default values (always 0 for numeric fields here)
// We mainly use this for the *initial* state and *full reset* (delete)
const generateDefaults = (ageGroup, expensesConfig, savingsConfig) => {
  const expenseDefaults = expensesConfig[ageGroup]?.reduce((acc, field) => {
    acc[field.name] = 0;
    return acc;
  }, {}) || {};
  const savingsDefaults = savingsConfig[ageGroup]?.reduce((acc, field) => {
    acc[field.name] = 0;
    return acc;
  }, {}) || {};
  return { ...expenseDefaults, ...savingsDefaults };
};

// Helper to get a completely clean state (all numeric fields 0)
const getCleanDefaultState = (targetAgeGroup, expensesConfig, savingsConfig) => {
    return {
        fullName: "",
        country: "",
        employmentStatus: "Employed",
        maritalStatus: "Single",
        monthlyIncome: 0,
        secondaryIncome: 0,
        taxableIncome: 0,
        deductions: 0,
        financialGoals: [],
        ageGroup: targetAgeGroup,
        ...generateDefaults(targetAgeGroup, expensesConfig, savingsConfig)
    };
};


function InputForm() {
  const navigate = useNavigate();
  const [ageGroup, setAgeGroup] = useState("26-35"); // Default age group
  const [isListening, setIsListening] = useState(false);

  // --- Define ageSpecificGoals, ageSpecificExpenses, ageSpecificSavings ---
  // (These objects remain unchanged)
    // Define age-specific financial goals with descriptions
    const ageSpecificGoals = {
        "18-25": [
        { goal: "Education Fund", description: "Save for college tuition and educational expenses" },
        { goal: "Emergency Fund", description: "Build 3-6 months of living expenses" },
        { goal: "First Car Purchase", description: "Save for your first vehicle" },
        { goal: "Student Loan Repayment", description: "Plan for student loan payments" },
        { goal: "Part-time Job Income", description: "Maximize part-time work earnings" },
        { goal: "Internship/Apprenticeship", description: "Fund career development opportunities" },
        { goal: "Basic Investment Portfolio", description: "Start investing in stocks/mutual funds" },
        { goal: "Travel Fund", description: "Save for travel experiences" }
        ],
        "26-35": [
        { goal: "Buying a House", description: "Save for down payment and home purchase" },
        { goal: "Career Development", description: "Invest in professional growth" },
        { goal: "Emergency Fund", description: "Maintain 6-12 months of expenses" },
        { goal: "Investment Portfolio", description: "Build diversified investment portfolio" },
        { goal: "Marriage Fund", description: "Save for wedding and related expenses" },
        { goal: "Car Purchase", description: "Plan for vehicle upgrade or replacement" },
        { goal: "Debt Repayment", description: "Pay off high-interest debts" },
        { goal: "Travel Fund", description: "Save for vacations and experiences" }
        ],
        "36-50": [
        { goal: "Retirement Planning", description: "Maximize retirement account contributions" },
        { goal: "Children's Education", description: "Save for children's college education" },
        { goal: "Home Renovation", description: "Fund home improvements and upgrades" },
        { goal: "Investment Portfolio", description: "Grow and diversify investments" },
        { goal: "Insurance Planning", description: "Secure life and health insurance" },
        { goal: "Debt Management", description: "Eliminate remaining debts" },
        { goal: "Emergency Fund", description: "Maintain 12+ months of expenses" },
        { goal: "Business Expansion", description: "Grow business or side ventures" }
        ],
        "51+": [
        { goal: "Retirement Planning", description: "Finalize retirement savings and planning" },
        { goal: "Healthcare Fund", description: "Save for medical expenses and long-term care" },
        { goal: "Estate Planning", description: "Plan for wealth transfer and inheritance" },
        { goal: "Legacy Planning", description: "Plan charitable giving and legacy" },
        { goal: "Travel Fund", description: "Save for retirement travel" },
        { goal: "Investment Portfolio", description: "Optimize investment strategy" },
        { goal: "Debt-Free Living", description: "Eliminate all remaining debts" },
        { goal: "Charitable Giving", description: "Plan philanthropic contributions" }
        ]
    };

    // Define age-specific expenses with descriptions and max values for sliders
    const ageSpecificExpenses = {
        "18-25": [
        { label: "Education Expenses", name: "educationExpenses", description: "Tuition, books, supplies", max: 50000 },
        { label: "Student Loan Payments", name: "studentLoans", description: "Monthly loan payments", max: 20000 },
        { label: "Transportation", name: "transport", description: "Public transit, car maintenance", max: 5000 },
        { label: "Entertainment", name: "entertainment", description: "Social activities, hobbies", max: 5000 },
        { label: "Food and Groceries", name: "foodGroceries", description: "Meals and groceries", max: 10000 },
        { label: "Mobile/Internet", name: "utilities", description: "Phone and internet bills", max: 2000 },
        { label: "Clothing", name: "clothing", description: "Clothing and accessories", max: 3000 },
        { label: "Health Insurance", name: "healthInsurance", description: "Health coverage costs", max: 5000 }
        ],
        "26-35": [
        { label: "Rent/Mortgage", name: "housing", description: "Monthly housing costs", max: 50000 },
        { label: "Utilities", name: "utilities", description: "Electric, water, gas bills", max: 5000 },
        { label: "Transportation", name: "transport", description: "Car payments, maintenance", max: 10000 },
        { label: "Food and Groceries", name: "foodGroceries", description: "Meals and groceries", max: 15000 },
        { label: "Entertainment", name: "entertainment", description: "Social activities", max: 8000 },
        { label: "Health Insurance", name: "healthInsurance", description: "Health coverage", max: 10000 },
        { label: "Car Payments", name: "carPayments", description: "Vehicle financing", max: 10000 },
        { label: "Debt Payments", name: "debtPayments", description: "Credit cards, loans", max: 20000 }
        ],
        "36-50": [
        { label: "Mortgage", name: "mortgage", description: "Home loan payments", max: 80000 },
        { label: "Utilities", name: "utilities", description: "Home utility bills", max: 8000 },
        { label: "Transportation", name: "transport", description: "Vehicle costs", max: 12000 },
        { label: "Food and Groceries", name: "foodGroceries", description: "Family meals", max: 20000 },
        { label: "Children's Education", name: "childrenEducation", description: "School fees, activities", max: 30000 },
        { label: "Health Insurance", name: "healthInsurance", description: "Family health coverage", max: 15000 },
        { label: "Car Payments", name: "carPayments", description: "Vehicle financing", max: 10000 },
        { label: "Debt Payments", name: "debtPayments", description: "Loans and credit", max: 25000 },
        { label: "Entertainment", name: "entertainment", description: "Family activities", max: 10000 }
        ],
        "51+": [
        { label: "Mortgage", name: "mortgage", description: "Home loan payments", max: 80000 },
        { label: "Utilities", name: "utilities", description: "Home utility bills", max: 8000 },
        { label: "Transportation", name: "transport", description: "Vehicle costs", max: 10000 },
        { label: "Food and Groceries", name: "foodGroceries", description: "Meals and groceries", max: 15000 },
        { label: "Healthcare Expenses", name: "healthcare", description: "Medical costs", max: 30000 },
        { label: "Insurance Premiums", name: "insurance", description: "Life and health insurance", max: 15000 },
        { label: "Entertainment", name: "entertainment", description: "Leisure activities", max: 10000 },
        { label: "Travel", name: "travel", description: "Vacation and travel costs", max: 20000 },
        { label: "Charitable Donations", name: "charitable", description: "Giving to causes", max: 50000 }
        ]
    };

    // Define age-specific savings fields
    const ageSpecificSavings = {
        "18-25": [
        { label: "Emergency Savings", name: "emergencySavings", description: "3-6 months of expenses" },
        { label: "Education Savings", name: "educationSavings", description: "For future education" },
        { label: "Car Savings", name: "carSavings", description: "For vehicle purchase" },
        { label: "Investment Savings", name: "investmentSavings", description: "For stock market" }
        ],
        "26-35": [
        { label: "House Down Payment", name: "houseSavings", description: "For home purchase" },
        { label: "Emergency Fund", name: "emergencyFund", description: "6-12 months of expenses" },
        { label: "Investment Portfolio", name: "investments", description: "Stocks and mutual funds" },
        { label: "Marriage Savings", name: "marriageSavings", description: "For wedding expenses" }
        ],
        "36-50": [
        { label: "Retirement Savings", name: "retirementSavings", description: "401(k), IRA" },
        { label: "College Fund", name: "collegeFund", description: "Children's education" },
        { label: "Emergency Fund", name: "emergencyFund", description: "12+ months of expenses" },
        { label: "Investment Portfolio", name: "investments", description: "Diversified investments" }
        ],
        "51+": [
        { label: "Retirement Savings", name: "retirementSavings", description: "Final retirement funds" },
        { label: "Healthcare Fund", name: "healthcareFund", description: "Medical expenses" },
        { label: "Legacy Fund", name: "legacyFund", description: "Inheritance planning" },
        { label: "Investment Portfolio", name: "investments", description: "Retirement investments" }
        ]
    };
  // --- End Definitions ---

  const { register, handleSubmit, reset, watch, getValues } = useForm({
    // Initial defaults when the component mounts for the first time
    defaultValues: getCleanDefaultState(ageGroup, ageSpecificExpenses, ageSpecificSavings)
  });

  // Handle form submission
  const onSubmit = (data) => {
    const numericData = { ...data };
    const currentAgeGroup = ageGroup; // Use state value for consistency

    // Define all potentially numeric fields based on the *current* age group
    const fieldsToConvert = [
        'monthlyIncome', 'secondaryIncome', 'taxableIncome', 'deductions',
        ...(ageSpecificExpenses[currentAgeGroup]?.map(f => f.name) || []),
        ...(ageSpecificSavings[currentAgeGroup]?.map(f => f.name) || [])
    ];

    fieldsToConvert.forEach(fieldName => {
        // Use nullish coalescing to treat undefined/null/empty string as 0
        numericData[fieldName] = Number(numericData[fieldName] ?? 0);
    });

    numericData.ageGroup = currentAgeGroup; // Ensure correct age group is saved

    localStorage.setItem("financialData", JSON.stringify(numericData));
    // navigate("/chat"); // Navigate after saving
    // console.log("Saved Data:", numericData); // For debugging
    navigate("/chat");
  };

  // Handle data deletion - resets completely to zeros
  const deleteData = () => {
    localStorage.removeItem("financialData");
    const defaultAgeGroup = "26-35";
    setAgeGroup(defaultAgeGroup);
    // Reset form to a clean state with all numeric fields (for that group) at 0
    reset(getCleanDefaultState(defaultAgeGroup, ageSpecificExpenses, ageSpecificSavings));
    alert("Data deleted successfully!");
  };

  // MODIFIED: Handle age group change while preserving values
  const handleAgeGroupChange = (newAgeGroup) => {
    const currentValues = getValues(); // Get all current form values
    setAgeGroup(newAgeGroup); // Update state

    // Prepare the data for reset: preserve common fields and existing numeric values
    const resetData = {
        // Preserve common non-numeric fields
        fullName: currentValues.fullName || "",
        country: currentValues.country || "",
        employmentStatus: currentValues.employmentStatus || "Employed",
        maritalStatus: currentValues.maritalStatus || "Single",

        // Preserve common numeric fields (income, taxes)
        // Use nullish coalescing (??) to handle 0 correctly
        monthlyIncome: currentValues.monthlyIncome ?? 0,
        secondaryIncome: currentValues.secondaryIncome ?? 0,
        taxableIncome: currentValues.taxableIncome ?? 0,
        deductions: currentValues.deductions ?? 0,

        // Reset financial goals as they are strongly tied to age group context
        financialGoals: [],

        // Set the new age group
        ageGroup: newAgeGroup,
    };

    // Get field names for the NEW age group
    const newExpenseNames = ageSpecificExpenses[newAgeGroup]?.map(f => f.name) || [];
    const newSavingsNames = ageSpecificSavings[newAgeGroup]?.map(f => f.name) || [];
    const newRelevantNumericFields = [...newExpenseNames, ...newSavingsNames];

    // Carry over existing values for fields relevant to the NEW group
    // If a field didn't exist before or was undefined, default it to 0
    newRelevantNumericFields.forEach(fieldName => {
        resetData[fieldName] = currentValues[fieldName] ?? 0;
    });

    // Reset the form. React Hook Form will update the inputs based on this data.
    // Fields that existed before but are NOT relevant to the new age group
    // will simply not be updated visually (as they aren't rendered),
    // but their values remain in the overall form state captured by getValues().
    reset(resetData);
  };

  // Add speech recognition functionality
  const startVoiceInput = () => {
    if ('webkitSpeechRecognition' in window) {
      const recognition = new window.webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        const nameInput = document.querySelector('input[name="fullName"]');
        if (nameInput) {
          nameInput.value = transcript;
          // Trigger React Hook Form's onChange event
          const event = new Event('input', { bubbles: true });
          nameInput.dispatchEvent(event);
        }
        setIsListening(false);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } else {
      alert('Speech recognition is not supported in your browser.');
    }
  };

  // Load saved data on component mount
  useEffect(() => {
    const savedData = localStorage.getItem("financialData");
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        const loadedAgeGroup = parsedData.ageGroup || "26-35"; // Default if missing

        setAgeGroup(loadedAgeGroup); // Set state first

        // Prepare clean defaults for the loaded age group
        const defaultsForLoadedGroup = getCleanDefaultState(loadedAgeGroup, ageSpecificExpenses, ageSpecificSavings);

        // Merge defaults with loaded data. Loaded data takes precedence.
        // Ensure numeric fields are numbers, fallback to 0 from defaults if invalid/missing in parsedData
        const finalDataForReset = {
            ...defaultsForLoadedGroup, // Start with clean slate (all 0s for numbers)
            ...parsedData, // Overlay saved data
            ageGroup: loadedAgeGroup, // Ensure ageGroup is correct
             // Re-validate/sanitize numeric fields after merging
            monthlyIncome: Number(parsedData.monthlyIncome ?? defaultsForLoadedGroup.monthlyIncome),
            secondaryIncome: Number(parsedData.secondaryIncome ?? defaultsForLoadedGroup.secondaryIncome),
            taxableIncome: Number(parsedData.taxableIncome ?? defaultsForLoadedGroup.taxableIncome),
            deductions: Number(parsedData.deductions ?? defaultsForLoadedGroup.deductions),
            // Ensure financialGoals is an array
            financialGoals: Array.isArray(parsedData.financialGoals) ? parsedData.financialGoals : [],
        };

         // Sanitize age-specific numeric fields
        const expenseNames = ageSpecificExpenses[loadedAgeGroup]?.map(f => f.name) || [];
        const savingsNames = ageSpecificSavings[loadedAgeGroup]?.map(f => f.name) || [];

        [...expenseNames, ...savingsNames].forEach(fieldName => {
             finalDataForReset[fieldName] = Number(parsedData[fieldName] ?? defaultsForLoadedGroup[fieldName]);
        });


        // Use reset with the merged and sanitized data
        // Timeout helps ensure state update potentially renders before reset applies
        setTimeout(() => reset(finalDataForReset), 0);

      } catch (error) {
        console.error("Error parsing saved financial data:", error);
        localStorage.removeItem("financialData");
        // Reset to clean state for the default age group if loading fails
        reset(getCleanDefaultState(ageGroup, ageSpecificExpenses, ageSpecificSavings));
      }
    } else {
       // No saved data, ensure form is in initial clean state
       reset(getCleanDefaultState(ageGroup, ageSpecificExpenses, ageSpecificSavings));
    }
    // Intentionally omitting 'ageGroup' and other dependencies that would cause
    // re-runs on every value change. We only want this effect on initial mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reset]); // Depend only on reset


  // --- JSX Structure (Largely unchanged, ensure valueAsNumber is used) ---

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 via-black to-gray-900 p-6">
      <div className="max-w-7xl w-full space-y-6">
        <h2 className="text-3xl font-extrabold text-center text-gray-200 mb-6">
          Financial Details
        </h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Personal Details Section */}
          <div className="bg-gray-900/80 backdrop-blur-md rounded-2xl border border-teal-500/20 shadow-xl p-8">
            <h3 className="text-2xl font-semibold text-teal-300 mb-6">Personal Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {/* Full Name with Voice Input */}
               <div>
                 <label className="block mb-2 font-semibold text-gray-200">Full Name</label>
                 <div className="relative">
                   <input
                     type="text"
                     {...register("fullName")}
                     className="w-full p-3 rounded-lg bg-gray-800/80 text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 transition pr-12"
                   />
                   <button
                     type="button"
                     onClick={startVoiceInput}
                     className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full transition-all duration-300 ${
                       isListening 
                         ? 'bg-red-500 text-white animate-pulse' 
                         : 'bg-teal-500 text-white hover:bg-teal-600'
                     }`}
                     title="Click to speak your name"
                   >
                     <svg 
                       xmlns="http://www.w3.org/2000/svg" 
                       className="h-5 w-5" 
                       viewBox="0 0 20 20" 
                       fill="currentColor"
                     >
                       <path 
                         fillRule="evenodd" 
                         d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" 
                         clipRule="evenodd" 
                       />
                     </svg>
                   </button>
                 </div>
               </div>
               {/* Age Group Buttons */}
        <div>
                 <label className="block mb-2 font-semibold text-gray-200">Age Group</label>
                 <div className="flex flex-wrap gap-2">
                   {["18-25", "26-35", "36-50", "51+"].map((group) => (
            <button
              key={group}
              type="button"
                       onClick={() => handleAgeGroupChange(group)}
                       className={`px-4 py-2 rounded-lg transition-all duration-300 ${
                         ageGroup === group
                           ? "bg-teal-500 text-white shadow-[0_0_8px_2px_rgba(45,212,191,0.8)]"
                           : "bg-gray-800/80 text-gray-200 hover:bg-gray-700/80"
                       }`}
            >
              {group}
            </button>
          ))}
        </div>
               </div>
               {/* Country */}
               <div>
                 <label className="block mb-2 font-semibold text-gray-200">Country</label>
                 <input
                   type="text"
                   {...register("country")}
                   className="w-full p-3 rounded-lg bg-gray-800/80 text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
                 />
               </div>
               {/* Employment Status */}
               <div>
                 <label className="block mb-2 font-semibold text-gray-200">Employment Status</label>
                 <select
                   {...register("employmentStatus")}
                   className="w-full p-3 rounded-lg bg-gray-800/80 text-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
                 >
          <option value="Employed">Employed</option>
          <option value="Self-employed">Self-employed</option>
          <option value="Unemployed">Unemployed</option>
          <option value="Retired">Retired</option>
          <option value="Student">Student</option>
        </select>
               </div>
               {/* Marital Status */}
               <div>
                 <label className="block mb-2 font-semibold text-gray-200">Marital Status</label>
                 <select
                   {...register("maritalStatus")}
                   className="w-full p-3 rounded-lg bg-gray-800/80 text-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
                 >
                   <option value="Single">Single</option>
                   <option value="Married">Married</option>
                   <option value="Divorced">Divorced</option>
                   <option value="Widowed">Widowed</option>
        </select>
               </div>
            </div>
          </div>

          {/* Income Section */}
          <div className="bg-gray-900/80 backdrop-blur-md rounded-2xl border border-teal-500/20 shadow-xl p-8">
            <h3 className="text-2xl font-semibold text-teal-300 mb-6">Income</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block mb-2 font-semibold text-gray-200">Monthly Income</label>
                <input
                  type="number"
                  {...register("monthlyIncome", { valueAsNumber: true })}
                  min="0"
                  className="w-full p-3 rounded-lg bg-gray-800/80 text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
                />
              </div>
              <div>
                <label className="block mb-2 font-semibold text-gray-200">Secondary Income (if any)</label>
                <input
                  type="number"
                  {...register("secondaryIncome", { valueAsNumber: true })}
                  min="0"
                  className="w-full p-3 rounded-lg bg-gray-800/80 text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
                />
              </div>
            </div>
          </div>

          {/* Expenses Section (Sliders) */}
          <div className="bg-gray-900/80 backdrop-blur-md rounded-2xl border border-teal-500/20 shadow-xl p-8">
            <h3 className="text-2xl font-semibold text-teal-300 mb-6">Expenses</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ageSpecificExpenses[ageGroup]?.map((field) => {
                const watchedValue = watch(field.name);
                const displayValue = watchedValue ?? 0;

                return (
                  <div key={field.name} className="relative group space-y-2">
                    <label className="block font-semibold text-gray-200 flex justify-between items-center">
                      <span>{field.label}</span>
                      <span className="text-sm font-mono text-teal-400 bg-gray-800/80 px-2 py-0.5 rounded">
                         ₹{Number(displayValue).toLocaleString()}
                      </span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max={field.max || 50000}
                      step="10"
                      {...register(field.name, { valueAsNumber: true })}
                      className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-teal-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-teal-500 transition"
                    />
                    <div className="absolute invisible group-hover:visible bg-gray-900 text-gray-200 p-2 rounded-lg text-xs mt-1 z-10 shadow-lg w-max max-w-xs">
                      {field.description} (Max: ₹{field.max || 50000})
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Savings Section */}
          <div className="bg-gray-900/80 backdrop-blur-md rounded-2xl border border-teal-500/20 shadow-xl p-8">
            <h3 className="text-2xl font-semibold text-teal-300 mb-6">Savings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {ageSpecificSavings[ageGroup]?.map((field) => (
                <div key={field.name} className="relative group">
                  <label className="block mb-2 font-semibold text-gray-200">{field.label}</label>
                  <input
                    type="number"
                    {...register(field.name, { valueAsNumber: true })}
                    min="0"
                    className="w-full p-3 rounded-lg bg-gray-800/80 text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
                  />
                  <div className="absolute invisible group-hover:visible bg-gray-900 text-gray-200 p-2 rounded-lg text-sm mt-1 z-10">
                    {field.description}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Goals Section */}
          <div className="bg-gray-900/80 backdrop-blur-md rounded-2xl border border-teal-500/20 shadow-xl p-8">
            <h3 className="text-2xl font-semibold text-teal-300 mb-6">Financial Goals</h3>
             <div className="relative group inline-block mb-4">
               <label className="block font-semibold text-gray-200">
                 Select Your Financial Goals
                 <span className="ml-2 text-xs text-gray-400">(Hover for details)</span>
                </label>
              </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {ageSpecificGoals[ageGroup]?.map((goal) => (
                <label key={goal.goal} className="relative group flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-800/80 transition-colors duration-200 cursor-pointer">
                  <input
                    type="checkbox"
                    {...register("financialGoals")}
                    value={goal.goal}
                    className="w-5 h-5 rounded border-gray-700/50 bg-gray-800/80 text-teal-500 focus:ring-teal-500 focus:ring-offset-gray-900 shrink-0"
                  />
                  <span className="text-gray-200 group-hover:text-white">{goal.goal}</span>
                  <div className="absolute invisible group-hover:visible bg-gray-900 text-gray-200 p-2 rounded-lg text-xs mt-8 left-0 z-10 shadow-lg w-max max-w-xs">
                    {goal.description}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Taxes Section */}
          <div className="bg-gray-900/80 backdrop-blur-md rounded-2xl border border-teal-500/20 shadow-xl p-8">
            <h3 className="text-2xl font-semibold text-teal-300 mb-6">Taxes</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { label: "Taxable Income", name: "taxableIncome" },
                { label: "Deductions and Exemptions", name: "deductions" },
              ].map((field) => (
                <div key={field.name}>
                  <label className="block mb-2 font-semibold text-gray-200">{field.label}</label>
                  <input
                    type="number"
                    {...register(field.name, { valueAsNumber: true })}
                    min="0"
                    className="w-full p-3 rounded-lg bg-gray-800/80 text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Form Buttons */}
          <div className="flex justify-center gap-6 pt-4">
            <button
              type="submit"
              className="px-8 py-3 bg-teal-500 text-white font-bold rounded-lg hover:bg-teal-600 hover:shadow-[0_0_12px_3px_rgba(45,212,191,0.7)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-teal-500 transition-all duration-300"
            >
              Submit & Go to Chat
            </button>
            <button
              type="button"
              onClick={deleteData}
              className="px-8 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 hover:shadow-[0_0_12px_3px_rgba(220,38,38,0.7)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-red-500 transition-all duration-300"
            >
              Delete Saved Data
          </button>
        </div>
      </form>
      </div>
    </div>
  );
}

export default InputForm;