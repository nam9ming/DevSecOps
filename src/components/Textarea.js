import { useState, useRef, useEffect, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import axios from 'axios';

const defaultCode = `pipeline {
  agent any
  
  parameters {
    choice(
      name: 'ENV',
      choices: ['dev', 'stage', 'prod'],
      description: '배포 대상 K8s 네임스페이스(테스트용)'
    )
  }

  stages {
    stage('hello') {
      steps {
        echo "hello 👋  selected ENV = \${params.ENV}"
      }
    }
  }

  post {
    always {
      echo "Pipeline finished: \${currentBuild.currentResult}"
    }
  }
}`;

const ProxyURL = process.env.REACT_APP_SERVER_URL || 'http://localhost:4000';

const Textarea = ( {jobName} ) => {
  const [mode, setMode] = useState('default');
  const [code, setCode] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [result, setResult] = useState({status: '', message: ''});
  const editorRef = useRef(null);

  useEffect(() => {
    fetchPipelineScript(jobName);
  }, [jobName]);

  // 해당 job의 Pipeline Script를 받아옴
  const fetchPipelineScript = async (JobName) => {
  try {
    const response = await axios.get(`${ProxyURL}/api/pipeline/config?job=${JobName}`); // 프록시 경유

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
    const getRes = await axios.get(`${ProxyURL}/api/pipeline/config?job=${JobName}`);
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
    await axios.post(`${ProxyURL}/api/pipeline/config?job=${JobName}`, updatedXML, {
      headers: {
        'Content-Type': 'application/xml',
      }
    });

    setResult({status: 'success', message: 'Saved'});
  } catch (error) {
      console.error('저장 실패:', error);
      setResult({status: 'error', message: 'Failed, ' + error.message});
    }
  };

   const handleSaveClick = useCallback(() => {
    setIsEditing(false);
    savePipelineScript(jobName, code);
  }, [jobName, code]);

  const handleSelectChange = (e) => {
    const selected = e.target.value;
    setMode(selected);
    setCode(selected === 'default' ? defaultCode : code);
  };

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
       <div className="relative border border-gray-300 rounded-md overflow-hidden text-sm font-mono h-[400px]">
        <Editor
          height="100%"
          value={code}
          onChange={(v) => setCode(v ?? '')}
          language="java"     // Groovy 플러그인 없으면 java로 하이라이트
          //theme="vs-dark"
          onMount={(editor, monaco) => {
            editorRef.current = editor;
            // Ctrl/Cmd + S → 저장 (편집중일 때만)
            editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
              if (isEditing) handleSaveClick();
            });
          }}
          options={{
            readOnly: !isEditing,                  // 편집 중이 아니면 잠금
            tabSize: 4,
            insertSpaces: true,
            automaticLayout: true,
            minimap: { enabled: false },
            wordWrap: 'off',
            scrollBeyondLastLine: false,
            renderWhitespace: 'boundary',
            renderLineHighlight: isEditing ? 'all' : 'none',
            occurrencesHighlight: isEditing,
            selectionHighlight: isEditing,
            contextmenu: true,                     
          }}
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
        <div role='alert' className={`${result.status === 'success'? 'text-green-600' :
                                        result.status === 'error' ? 'text-red-600' : ''
        }`}>{ result.message }</div>
      </div>
    </div>
  );
};

export default Textarea;
