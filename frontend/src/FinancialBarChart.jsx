import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";

const FinancialBarChart = ({ data }) => {
  const chartData = [
    { name: "Income", amount: data.income },
    { name: "Expenses", amount: data.expenses },
    { name: "Savings", amount: data.savings },
    { name: "Investments", amount: data.investments },
    { name: "Debt", amount: data.debt }
  ];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="amount" fill="#017143" />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default FinancialBarChart;
