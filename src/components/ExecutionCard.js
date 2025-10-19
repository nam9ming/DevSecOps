import React from 'react';
import { useNavigate } from 'react-router-dom';
import classNames from 'classnames';

const RESULT_COLOR = {
  Success: "text-green-600",
  Failed: "text-red-600",
  Building: "text-blue-600",
  Unstable: "text-yellow-600",
  Aborted: "text-gray-500",
  NotBuilt: "text-gray-500",
  Disabled: "text-gray-500",
  Pending: "text-gray-500",
};

function normalizeResult(r) {
  // 혹시 서버에서 대문자(SUCCESS) 등으로 올 때 대비
  const v = String(r || "Pending").toUpperCase();
  if (v === "SUCCESS") return "Success";
  if (v === "FAILED") return "Failed";
  if (v === "UNSTABLE") return "Unstable";
  if (v === "ABORTED") return "Aborted";
  if (v === "NOT_BUILT" || v === "NOTBUILT") return "NotBuilt";
  if (v === "DISABLED") return "Disabled";
  if (v === "BUILDING") return "Building";
  if (v === "PENDING") return "Pending";
  // 알 수 없는 값은 회색 처리
  return "Pending";
}

const ExecutionCard = ({ data, serviceId, env }) => {
  const navigate = useNavigate();
  const result = normalizeResult(data?.result);
  const resultClass = RESULT_COLOR[result]; //|| RESULT_COLOR.Pending;

  const handleClick = () => {
    navigate(`/service/${serviceId}/${env}/execution/${data.id}`);
  };

  return (
    <div
      onClick={handleClick}
      className="cursor-pointer bg-white border border-gray-200 rounded-lg shadow-sm p-5 transition hover:shadow-md hover:border-blue-400"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-medium text-lg text-gray-900 mb-1 truncate">
            {data?.message || `빌드 #${data?.id ?? ""}`}
          </div>
          <div className="text-sm text-gray-600">
            {data.lastDeploy ? `${data.lastDeploy}` : "-"}
          </div>
        </div>

        
      </div>

      {/* 하단 텍스트 색상도 상태에 맞춰 표시 */}
      <div className={classNames("mt-2 text-sm font-semibold", resultClass)}>
        {result}
      </div>
    </div>
  );
};

export default ExecutionCard;
