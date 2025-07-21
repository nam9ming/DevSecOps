import { useParams } from 'react-router-dom';
import Textarea from '../components/Textarea';

const EnvPage = () => {
  const { serviceId, envId } = useParams();

  const jobName = `${serviceId}-${envId}`;
  console.log(jobName);
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
