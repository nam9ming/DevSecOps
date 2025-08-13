import React from 'react';
import { CheckCircle, XCircle, PauseCircle, Loader2 } from 'lucide-react';

const statusColor = {
  SUCCESS: {
    bg: 'bg-green-50',
    border: 'border-green-300',
    text: 'text-green-800',
    icon: <CheckCircle className="w-4 h-4 text-green-600" />
  },
  FAILURE: {
    bg: 'bg-red-50',
    border: 'border-red-300',
    text: 'text-red-800',
    icon: <XCircle className="w-4 h-4 text-red-600" />
  },
  FAILED: {
    bg: 'bg-red-50',
    border: 'border-red-300',
    text: 'text-red-800',
    icon: <XCircle className="w-4 h-4 text-red-600" />
  },
  ERROR: {
    bg: 'bg-red-50',
    border: 'border-red-300',
    text: 'text-red-800',
    icon: <XCircle className="w-4 h-4 text-red-600" />
  },
  SKIPPED: {
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    text: 'text-gray-400',
    icon: <PauseCircle className="w-4 h-4 text-gray-400" />
  },
  ABORTED: {
    bg: 'bg-gray-100',
    border: 'border-gray-300',
    text: 'text-gray-500',
    icon: <PauseCircle className="w-4 h-4 text-gray-500" />
  },
  IN_PROGRESS: {
    bg: 'bg-blue-50',
    border: 'border-blue-300',
    text: 'text-blue-700',
    icon: <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
  },
  RUNNING: {
    bg: 'bg-blue-50',
    border: 'border-blue-300',
    text: 'text-blue-700',
    icon: <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
  },
  DEFAULT: {
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    text: 'text-gray-800',
    icon: <PauseCircle className="w-4 h-4 text-gray-400" />
  }
};

const statusLabel = {
  SUCCESS: 'Success',
  SUCCESSFUL: 'Success',
  FAILURE: 'Error',
  FAILED: 'Error',
  ERROR: 'Error',
  SKIPPED: 'Skipped',
  ABORTED: 'Aborted',
  IN_PROGRESS: 'Running',
  RUNNING: 'Running'
};

const StageDiagram = ({ buildInfo }) => {
  const stages = buildInfo?.stages || [];

  if (!stages.length) {
    return (
      <div className="text-gray-400 text-center mt-8 mb-6">
        스테이지 정보 없음
      </div>
    );
  }

  return (
    <div className="flex flex-wrap justify-start gap-4 mt-6">
      {stages.map((stage, i) => {
        const rawStatus = (stage.status || stage.result || '').toUpperCase();
        const info = statusColor[rawStatus] || statusColor.DEFAULT;
        const label = statusLabel[rawStatus] || rawStatus;

        return (
          <div
            key={stage.id || stage.name || i}
            className={`w-36 py-4 px-2 rounded-lg border text-center shadow-sm transition-all flex flex-col items-center ${info.bg} ${info.border} ${info.text}`}
          >
            <div className="flex justify-center items-center gap-1 mb-1">
              {info.icon}
              <span className="font-semibold">{stage.name || `단계${i + 1}`}</span>
            </div>
            <div className="text-xs mb-1">{label}</div>
            {stage.durationMillis !== undefined && (
              <div className="text-xs text-gray-400">
                ({(stage.durationMillis / 1000).toFixed(2)}s)
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default StageDiagram;
