import React, { useState } from 'react';

function ReleaseView() {
  const [branch, setBranch] = useState('');
  const [environment, setEnvironment] = useState('dev');

  const handleRelease = () => {
    console.log(`브랜치: ${branch}, 배포 환경: ${environment}`);
    // TODO: axios.post(`/api/release`, { branch, environment }) 호출
  };

  return (
    <div>
      <h2>릴리즈 배포</h2>
      <div>
        <label>브랜치 또는 태그:</label>
        <input
          type="text"
          value={branch}
          onChange={(e) => setBranch(e.target.value)}
          placeholder="ex) main, v1.0.0"
          required
        />
      </div>
      <div>
        <label>배포 환경 선택:</label>
        <select value={environment} onChange={(e) => setEnvironment(e.target.value)}>
          <option value="dev">개발(dev)</option>
          <option value="stage">스테이징(stage)</option>
          <option value="prod">운영(prod)</option>
        </select>
      </div>
      <button onClick={handleRelease}>배포 실행</button>
    </div>
  );
}

export default ReleaseView;
