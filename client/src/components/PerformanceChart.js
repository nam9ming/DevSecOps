import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const data = {
  labels: ['Dev', 'Stage', 'Prod'],
  datasets: [
    {
      label: 'TPS',
      data: [120, 150, 186],
      backgroundColor: ['#3b82f6', '#10b981', '#f59e0b'],
      borderRadius: 6,
      borderSkipped: false,
    }
  ]
};

const options = {
  responsive: true,
  plugins: {
    legend: {
      display: true,
      position: 'top'
    }
  },
  scales: {
    y: {
      beginAtZero: true
    }
  }
};

const PerformanceChart = () => {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <h4 className="text-lg font-semibold mb-4 text-gray-800">평균 TPS (환경별)</h4>
      <Bar data={data} options={options} />
    </div>
  );
};

export default PerformanceChart;
