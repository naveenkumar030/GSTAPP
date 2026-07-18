import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import ResetPassword from './pages/ResetPassword';
import Terms from './pages/Terms';
import Overview from './pages/Overview';
import Upload from './pages/Upload';
import Reconciliation from './pages/Reconciliation';
import Mismatch from './pages/Mismatch';
import Fraud from './pages/Fraud';
import NetworkGraph from './pages/NetworkGraph';
import FraudGraph from './pages/FraudGraph';
import Cases from './pages/Cases';
import Reports from './pages/Reports';
import Audit from './pages/Audit';
import Settings from './pages/Settings';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/dashboard" element={<Layout />}>
        <Route index element={<Overview />} />
        <Route path="upload" element={<Upload />} />
        <Route path="reconciliation" element={<Reconciliation />} />
        <Route path="mismatch" element={<Mismatch />} />
        <Route path="fraud" element={<Fraud />} />
        <Route path="network-graph" element={<NetworkGraph />} />
        <Route path="fraud-graph" element={<FraudGraph />} />
        <Route path="cases" element={<Cases />} />
        <Route path="reports" element={<Reports />} />
        <Route path="audit" element={<Audit />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

export default App;
