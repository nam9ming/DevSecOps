
import React from 'react';
import { AlertTriangle, Clock, CheckCircle } from 'lucide-react';

const NotificationList = () => (
  <div className="space-y-4">
    <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
      <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
      <div>
        <p className="font-medium text-red-800">Critical 보안 이슈 발견</p>
        <p className="text-sm text-red-600">Shopping Service에서 SQL Injection 취약점 감지</p>
        <p className="text-xs text-red-500 mt-1">5분 전</p>
      </div>
    </div>
    <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
      <Clock className="w-5 h-5 text-yellow-600 mt-0.5" />
      <div>
        <p className="font-medium text-yellow-800">배포 대기 중</p>
        <p className="text-sm text-yellow-600">User Service v2.1.0 스테이징 배포 대기</p>
        <p className="text-xs text-yellow-500 mt-1">15분 전</p>
      </div>
    </div>
    <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
      <div>
        <p className="font-medium text-green-800">배포 성공</p>
        <p className="text-sm text-green-600">Chat Service v1.1 프로덕션 배포 완료</p>
        <p className="text-xs text-green-500 mt-1">1시간 전</p>
      </div>
    </div>
  </div>
);

export default NotificationList;
