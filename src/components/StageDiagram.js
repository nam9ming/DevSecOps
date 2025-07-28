import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

const StageDiagram = ({ execId }) => {
  const stages = ['Build', 'Test', 'Deploy', 'Notify'];
  const status = ['Error', 'Success', 'Success', 'Success'];

  return (
    <div className="flex flex-wrap justify-start gap-4 mt-6">
      {stages.map((stage, i) => {
        const isSuccess = status[i] === 'Success';

        return (
          <div
            key={stage}
            className={`w-28 py-3 px-2 rounded-lg border text-center shadow-sm transition-all
              ${isSuccess
                ? 'bg-green-50 border-green-300 text-green-800'
                : 'bg-red-50 border-red-300 text-red-800'
              }`}
          >
            <div className="flex justify-center items-center gap-1 mb-1">
              {isSuccess ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <XCircle className="w-4 h-4 text-red-600" />
              )}
              <span className="font-semibold">{stage}</span>
            </div>
            <div className="text-xs">
              {status[i]}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StageDiagram;
