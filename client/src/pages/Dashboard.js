import React from 'react';
import {
  Code, AlertTriangle, CheckCircle, TrendingUp, Database, Clock
} from 'lucide-react';
import { Link } from 'react-router-dom';
import StatusBadge from '../components/StatusBadge';
import MetricCard from '../components/MetricCard';
import SecurityChart from '../components/SecurityChart';
import PerformanceChart from '../components/PerformanceChart';
import NotificationList from '../components/NotificationList';

const buildStatus = [
  { name: 'Chat Service', dev: 'success', stage: 'building', prod: 'success' },
  { name: 'Shopping Service', dev: 'success', stage: 'failed', prod: 'success' },
  { name: 'User Service', dev: 'building', stage: 'success', prod: 'success' },
  { name: 'Payment Service', dev: 'success', stage: 'success', prod: 'pending' }
];

const Dashboard = () => {
  return (
    <div className="space-y-6">
      {/* 페이지 타이틀 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Clock className="w-4 h-4" />
          마지막 업데이트: 2분 전
        </div>
      </div>

      {/* 주요 지표 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard title="활성 빌드" value="12" change={8} icon={Code} color="bg-blue-500" />
        <MetricCard title="보안 이슈" value="7" change={-15} icon={AlertTriangle} color="bg-red-500" />
        <MetricCard title="성공률" value="94%" change={2} icon={CheckCircle} color="bg-green-500" />
        <MetricCard title="평균 TPS" value="186" change={12} icon={TrendingUp} color="bg-purple-500" />
      </div>

      {/* 서비스 배포 상태 */}
      <section className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">서비스 배포 상태</h3>
        </div>
        <div className="p-6 space-y-4">
          {buildStatus.map((service, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Database className="w-5 h-5 text-gray-600" />
                <Link
                  to={`/service/${service.name.toLowerCase().replace(/\s+/g, '-')}`}
                  className="font-medium text-gray-900 hover:underline"
                >
                  {service.name} <span className="text-blue-500">&gt;</span>
                </Link>
              </div>
              <div className="flex items-center gap-4">
                {['dev', 'stage', 'prod'].map((envKey) => (
                  <div key={envKey} className="flex items-center gap-2">
                    <Link
                      to={`/service/${service.name.toLowerCase().replace(/\s+/g, '-')}/env/${envKey}`}
                      className="text-sm text-blue-500 hover:underline flex items-center gap-1"
                    >
                      {envKey.charAt(0).toUpperCase() + envKey.slice(1)} <span>&gt;</span>
                    </Link>
                    <StatusBadge status={service[envKey]} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 차트 영역 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SecurityChart />
        <PerformanceChart />
      </div>

      {/* 알림 목록 */}
      <NotificationList />
    </div>
  );
};

export default Dashboard;
