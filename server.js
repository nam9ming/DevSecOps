const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 4000;

const pipelineRoute = require('./routes/pipelineRoute')
const deploymentRoute = require('./routes/deploymentRoute');

app.use(cors());
app.use(express.json());
app.use(express.text({ type: 'application/xml' }));

app.use('/api/pipeline', pipelineRoute);
app.use('/api/deployment', deploymentRoute);

app.post("/Inter", (req, res) => {
  const { JenkinsUrl, JenkinsApiToken, GitHubApiToken, DockerRegistryURL, KubernetesConfig } = req.body;

  console.log(JenkinsUrl)
  try {
    res.status(200).json({
    message: "정보 저장 완료",
    receiveData: { JenkinsUrl, JenkinsApiToken, GitHubApiToken, DockerRegistryURL, KubernetesConfig },
  });
  } catch (err) {
    console.log(err + "에러");
  }
});

app.listen(port, () => {
  console.log(`서버 실행 중: http://localhost:${port}`);
});
