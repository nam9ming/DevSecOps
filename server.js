// server.js

// server.js 맨 위 (어떤 import 보다 먼저!)
require('dotenv').config();
console.log('[BOOT] SONAR_TOKEN length =', (process.env.SONAR_TOKEN || '').length);

const express = require('express');
const cors = require('cors');

const pipelineRoute = require('./routes/pipelineRoute');
const deploymentRoute = require('./routes/deploymentRoute');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.text({ type: 'application/xml' }));

// 신규 경로
app.use('/api/pipeline', pipelineRoute);
app.use('/api/deployment', deploymentRoute);

// 레거시 호환(기존 프런트 유지): /api/jenkins/* , /jenkins/config
app.use('/api/jenkins', pipelineRoute); // services, :jobName/executions, :jobName/build/:execId
app.use('/jenkins', pipelineRoute);     // /jenkins/config GET/POST

const perfRoute = require('./routes/perfRoute');
app.use('/api/perf', perfRoute);

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`✅ Backend running at http://localhost:${port}`));
