import { useState, useRef, useEffect } from 'react';
import axios from 'axios';

const defaultCode = `pipeline {
    agent any
    stages {
        stage('Clone Repository') {
            steps {
                git 'https://your-repository-url.git/'
            }
        }
    }
}`;
const ProxyURL = 'http://localhost:4000';

const Textarea = ( {jobName} ) => {
  const [mode, setMode] = useState('default');
  const [code, setCode] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const lineRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    fetchPipelineScript(jobName);
  }, [jobName]);

  // 해당 job의 Pipeline Script를 받아옴
  const fetchPipelineScript = async (JobName) => {
  try {
    const response = await axios.get(`${ProxyURL}/jenkins/config?job=${JobName}`); // 프록시 경유

    const xmlParser = new DOMParser();
    const xmlDoc = xmlParser.parseFromString(response.data, 'text/xml');
    const scriptTag = xmlDoc.getElementsByTagName('script')[0];
    
    if (scriptTag) {
      setCode(scriptTag.textContent.trim());
    } else {
      console.warn('스크립트 태그를 찾을 수 없습니다.');
    }
  } catch (error) {
    console.error('Jenkins 파이프라인 불러오기 실패:', error);
  }
  };

  // 작성한 Pipeline Scrip를 저장
  const savePipelineScript = async (JobName, newCode) => {
  try {
    // 1. 기존 config 가져오기
    const getRes = await axios.get(`${ProxyURL}/jenkins/config?job=${JobName}`);
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(getRes.data, 'text/xml');
    console.log(xmlDoc);

    // 2. script 태그 내용 가져옴(Pipeline 스크립트)
    const scriptNode = xmlDoc.getElementsByTagName('script')[0];
    scriptNode.textContent = newCode;

    // 3. 문자열로 변환
    const serializer = new XMLSerializer();
    let updatedXML = serializer.serializeToString(xmlDoc);
    console.log('💾 전송할 XML:', updatedXML);

    // 4. Jenkins로 저장 요청
    await axios.post(`${ProxyURL}/jenkins/config?job=${JobName}`, updatedXML, {
      headers: {
        'Content-Type': 'application/xml',
      }
    });

    alert('Jenkins 파이프라인 저장 완료.');
  } catch (error) {
      console.error('저장 실패:', error);
      alert('Jenkins 파이프라인 저장 실패: ' + error.message);
    }
  };

  const syncScroll = () => {
    if (lineRef.current && textareaRef.current) {
      lineRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const handleSelectChange = (e) => {
    const selected = e.target.value;
    setMode(selected);
    setCode(selected === 'default' ? defaultCode : code);
  };

  const lines = code.split('\n');

  return (
    <div className="space-y-3">
      {/* 콤보박스 상단 */}
      <div>
        <label className="text-sm font-medium mr-2 text-gray-700">모드 선택:</label>
        <select
          value={mode}
          onChange={handleSelectChange}
          disabled={!isEditing}
          className={`border rounded px-3 py-1 text-sm ${
            isEditing ? 'border-gray-300' : 'bg-gray-100 text-gray-500 cursor-not-allowed'
          }`}
        >
          <option value="default">default</option>
          <option value="customize">customize</option>
        </select>
      </div>

      {/* 에디터 영역 */}
      <div className="flex border border-gray-300 rounded-md overflow-hidden text-sm font-mono h-[400px]">
        {/* 줄 번호 */}
        <div
          ref={lineRef}
          className="bg-gray-100 text-gray-500 px-3 py-2 text-right select-none overflow-y-auto"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          <style>
            {`
              div::-webkit-scrollbar {
                display: none;
              }
            `}
          </style>
          {lines.map((_, i) => (
            <div key={i} className="h-[1.5rem] leading-[1.5rem]">
              {i + 1}
            </div>
          ))}
        </div>

        {/* 코드 입력 */}
        <textarea
          ref={textareaRef}
          value={code}
          onScroll={syncScroll}
          onChange={(e) => setCode(e.target.value)}
          readOnly={!isEditing}
          className={`flex-1 p-2 outline-none resize-none font-mono overflow-y-auto ${
            isEditing ? 'text-gray-800' : 'bg-gray-50 text-gray-500 cursor-not-allowed'
          }`}
          style={{ lineHeight: '1.5rem' }}
        />
      </div>

      {/* 하단 버튼 */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsEditing(true)}
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
        >
          Edit
        </button>
        
        <button
          onClick={() => {
            setIsEditing(false); 
            savePipelineScript(jobName,code);
          }} 
          disabled={!isEditing}
          className={`px-4 py-2 rounded ${
            isEditing
              ? 'bg-blue-500 text-white hover:bg-blue-600'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          Save
        </button>
      </div>
    </div>
  );
};

export default Textarea;
