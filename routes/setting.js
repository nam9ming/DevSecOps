const express = require("express");
const router = express.Router();

let jenkinsUrl = process.env.JENKINS_URL;
let jenkinsApiToken = process.env.JENKINS_API_TOKEN;
let githubApiToken = process.env.GITHUB_API_TOKEN;
let dockerRegistryUrl = process.env.DOCKER_REGISTRY_URL;
let kubernetesConfig = process.env.KUBERNETES_CONFIG;

router.post("/inter", (req, res) => {
    const { JenkinsUrl, JenkinsApiToken, GitHubApiToken, DockerRegistryURL, KubernetesConfig } = req.body;

    jenkinsUrl = JenkinsUrl;
    jenkinsApiToken = JenkinsApiToken;
    githubApiToken = GitHubApiToken;
    dockerRegistryUrl = DockerRegistryURL;
    kubernetesConfig = KubernetesConfig;

    console.log("프론트엔드로부터 받은 여러 데이터:");
    console.log(`  URL: ${jenkinsUrl}`);
    console.log(`  API: ${jenkinsApiToken}`);
    console.log(`  GAPI: ${githubApiToken}`);
    console.log(`  DURL: ${dockerRegistryUrl}`);
    console.log(`  KCONFIG: ${kubernetesConfig}`);

    // 여기에서 받은 데이터를 데이터베이스에 저장하거나 다른 백엔드 로직을 수행합니다.
    // 예: saveContactEntry({ firstName, lastName, email, message });

    res.status(200).json({
        message: "모든 정보가 성공적으로 수신되었습니다!",
        receivedData: { JenkinsUrl, JenkinsApiToken, GitHubApiToken, DockerRegistryURL, KubernetesConfig },
    });
});

module.exports = router;
