// server.js
require('dotenv').config();
console.log('[BOOT] SONAR_TOKEN length =', (process.env.SONAR_TOKEN || '').length);

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 4000;

// 라우트 불러오기
const setting_router = require('./routes/setting.js');
const { authenticateToken } = require('./routes/auth/auth_middleware.js');
const auth = require('./routes/auth/auth_controller.js');

const pipelineRoute = require('./routes/pipelineRoute');
const deploymentRoute = require('./routes/deploymentRoute');
const perfRoute = require('./routes/perfRoute');

// CORS 설정
app.use(cors());
app.use(
  cors({
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// 바디 파서
app.use(express.json());
app.use(express.text({ type: 'application/xml' }));

// 정적 파일 제공
app.use(express.static(path.join(__dirname, '../public')));

// 루트 요청 처리
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 신규 API 경로
app.use('/api/pipeline', pipelineRoute);
app.use('/api/deployment', deploymentRoute);
app.use('/api/perf', perfRoute);

// 레거시 호환
app.use('/api/jenkins', pipelineRoute); // services, :jobName/executions, :jobName/build/:execId
app.use('/jenkins', pipelineRoute);     // /jenkins/config GET/POST

// 설정 페이지
app.use('/setting', setting_router);

// 인증 라우트
app.post('/api/auth', auth);

// 보호된 라우트 예시
app.get('/api/profile', authenticateToken, (req, res) => {
  res.json({ message: `안녕하세요, ${req.user.username}님! 이것은 보호된 정보입니다.` });
});

app.listen(port, () => {
  console.log(`✅ Backend running at http://localhost:${port}`);
});
