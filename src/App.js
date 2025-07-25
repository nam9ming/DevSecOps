import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ServicePage from './pages/ServicePage';
import EnvPage from './pages/EnvPage';
import Repositories from './pages/Repositories';
import Pipelines from './pages/Pipelines';
import Deployments from './pages/Deployments';
import Security from './pages/Security';
import Testing from './pages/Testing';
import Settings from './pages/Settings';
// 다른 페이지들 import

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="/service/:serviceId" element={<ServicePage />} />
          <Route path="/service/:serviceId/env/:envId" element={<EnvPage />} />
          <Route path="repositories" element={<Repositories />} />
          <Route path="pipelines" element={<Pipelines />} />
          <Route path="deployments" element={<Deployments />} />
          <Route path="security" element={<Security />} />
          <Route path="testing" element={<Testing />} />
          <Route path="setting" element={<Settings />} />
          {/* 추가 페이지들 */}
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
