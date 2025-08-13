// src/components/StatusBadge.js
const StatusBadge = ({ status }) => {
  const colors = {
    success: "bg-green-500",
    failed: "bg-red-500",
    unstable: "bg-yellow-500",
    building: "bg-blue-500 animate-pulse",
    pending: "bg-gray-400",
    disabled: "bg-gray-400"
  };
  return (
    <span className={`px-3 py-1 rounded-full text-white text-xs font-semibold ${colors[status] || "bg-gray-400"}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};
export default StatusBadge;
