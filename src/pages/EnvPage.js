import { useParams } from 'react-router-dom';
import Textarea from '../components/Textarea';

const EnvPage = () => {
  const { serviceId, envId } = useParams();

  // 💡 잡이름에 환경명이 이미 포함돼 있다면 아래처럼!
  const jobName = serviceId;
  // 만약 환경명을 따로 붙여야 하는 구조면 기존대로 (`${serviceId}-${envId}`) 사용

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">
        {serviceId.replace('-', ' ')} - {envId.toUpperCase()} 파이프라인
      </h2>
      <div className="border p-4 bg-gray-50 rounded-lg shadow-sm">
        <Textarea jobName={jobName}/>
      </div>
    </div>
  );
};

export default EnvPage;
