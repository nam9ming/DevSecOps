import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend);

const data = {
  labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  datasets: [
    {
      label: '보안 이슈 수',
      data: [12, 9, 6, 4, 5, 3, 7],
      backgroundColor: 'rgba(255, 99, 132, 0.2)',
      borderColor: '#ef4444',
      borderWidth: 2,
      tension: 0.4,
      fill: true,
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

const SecurityChart = () => {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <h4 className="text-lg font-semibold mb-4 text-gray-800">보안 이슈 트렌드</h4>
      <Line data={data} options={options} />
    </div>
  );
};

export default SecurityChart;
