// 본인 젠킨스 정보로 변경.
const Jenkins = {
  // 젠킨스 URL
  JENKINS_URL: 'http://localhost:8080',
  AUTH: {
    // 젠킨스 사용자 이름
    username: 'admin', 
    // 비밀번호는 젠킨스 API 토큰으로 설정
    password: '1118b413841ccc245605118c31499655c5'
  }
};

module.exports = Jenkins;