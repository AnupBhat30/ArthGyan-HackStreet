import React from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const COLORS = ["#0088FE", "#FFBB28", "#00C49F", "#FF8042", "#A28DDC"];

const FinancialPieChart = ({ data }) => {
  const chartData = [
    { name: "Expenses", value: data.expenses },
    { name: "Savings", value: data.savings },
    { name: "Investments", value: data.investments },
    { name: "Debt", value: data.debt }
  ];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          outerRadius={100}
          fill="#8884d8"
          dataKey="value"
          label
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default FinancialPieChart;
