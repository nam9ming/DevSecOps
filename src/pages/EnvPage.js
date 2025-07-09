import { useParams } from 'react-router-dom';

const EnvPage = () => {
  const { serviceId, envId } = useParams();

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">
        {serviceId.replace('-', ' ')} - {envId.toUpperCase()} 파이프라인
      </h2>
      <div className="border p-4 bg-gray-50 rounded-lg shadow-sm">
        <p className="text-gray-700">⚙️ 여기에 {envId.toUpperCase()} 환경의 파이프라인 상태 정보가 들어갑니다.</p>
        {/* 추후에 실제 API 연동 or 컴포넌트 삽입 */}
      </div>
    </div>
  );
};

export default EnvPage;
