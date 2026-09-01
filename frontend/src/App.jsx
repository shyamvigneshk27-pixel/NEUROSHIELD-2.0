import React, { useState, useEffect } from 'react';
import DashboardLayout from './components/DashboardLayout';
import AnalysisView from './components/AnalysisView';
import PatientRecordsView from './components/PatientRecordsView';
import SettingsView from './components/SettingsView';
import Login from './components/Login';
import AdminView from './components/AdminView';
import ReportSummaryView from './components/ReportSummaryView';
import { API_BASE, authFetch, ApiError } from './api';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(null);
  const [activeTab, setActiveTab] = useState('Analysis');

  // ML States
  const [signalData, setSignalData] = useState(null);
  const [riskScore, setRiskScore] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [loginSessions, setLoginSessions] = useState([]);
  const [analysisHistory, setAnalysisHistory] = useState([]);

  // Persistence check
  useEffect(() => {
    const savedUser = localStorage.getItem('neuro_user');
    const savedToken = localStorage.getItem('neuro_token');
    if (savedUser && savedToken) {
      setCurrentUser(JSON.parse(savedUser));
      setToken(savedToken);
    }

    const sessions = localStorage.getItem('neuro_sessions');
    if (sessions) setLoginSessions(JSON.parse(sessions));

    const history = localStorage.getItem('neuro_history');
    if (history) setAnalysisHistory(JSON.parse(history));
  }, []);

  const pushHistory = (record) => {
    setAnalysisHistory(prev => {
      const updated = [record, ...prev].slice(0, 50);
      localStorage.setItem('neuro_history', JSON.stringify(updated));
      return updated;
    });
  };

  const handleLogin = ({ token: newToken, user }) => {
    setToken(newToken);
    setCurrentUser(user);
    localStorage.setItem('neuro_token', newToken);
    localStorage.setItem('neuro_user', JSON.stringify(user));

    const newSession = {
      id: Date.now(),
      user: user.full_name,
      role: user.role,
      loginTime: new Date().toLocaleString(),
      status: 'Active',
    };
    const updatedSessions = [newSession, ...loginSessions.slice(0, 19)];
    setLoginSessions(updatedSessions);
    localStorage.setItem('neuro_sessions', JSON.stringify(updatedSessions));
    setActiveTab(user.role === 'admin' ? 'System Admin' : 'Analysis');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setToken(null);
    localStorage.removeItem('neuro_user');
    localStorage.removeItem('neuro_token');
  };

  // Called when the API rejects our token (expired/invalid) -- fail safe, not silently.
  const handleAuthExpired = () => {
    handleLogout();
    setUploadError('Your session expired. Please sign in again.');
  };

  const runUpload = async (file, endpoint, inputType) => {
    setLoading(true);
    setUploadError('');

    const formData = new FormData();
    formData.append('file', file);
    if (currentUser?.role === 'patient') {
      formData.append('patient_id', currentUser.id);
    }

    try {
      const data = await authFetch(endpoint, { method: 'POST', body: formData, token });

      setSignalData(data.raw_signal || data.prediction?.raw_signal || null);
      setRiskScore(data.prediction?.risk_score ?? null);
      setAnalysisResult(data.prediction || null);

      pushHistory({
        id: Date.now(),
        timestamp: new Date().toLocaleString(),
        inputType,
        filename: file.name,
        user: currentUser?.full_name || 'Unknown',
        prediction: data.prediction,
        aiSummary: '',
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        handleAuthExpired();
      } else {
        setUploadError(error.message || `Failed to analyze ${inputType.toUpperCase()}.`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCsvUpload = (file) => runUpload(file, '/analyze/csv', 'csv');
  const handleImageUpload = (file) => runUpload(file, '/analyze/image', 'image');

  const handleSummaryReady = (summary) => {
    setAnalysisHistory(prev => {
      if (prev.length === 0) return prev;
      const updated = [...prev];
      updated[0] = { ...updated[0], aiSummary: summary };
      localStorage.setItem('neuro_history', JSON.stringify(updated));
      return updated;
    });
  };

  const renderActiveView = () => {
    switch (activeTab) {
      case 'Analysis':
        return (
          <AnalysisView
            signalData={signalData}
            riskScore={riskScore}
            analysisResult={analysisResult}
            loading={loading}
            uploadError={uploadError}
            handleCsvUpload={handleCsvUpload}
            handleImageUpload={handleImageUpload}
            token={token}
          />
        );
      case 'Patient Records':
        return <PatientRecordsView token={token} />;
      case 'Report Summary':
        return (
          <ReportSummaryView
            signalData={signalData}
            riskScore={riskScore}
            analysisResult={analysisResult}
            loading={loading}
            onSummaryReady={handleSummaryReady}
            token={token}
          />
        );
      case 'System Admin':
        return <AdminView sessions={loginSessions} analysisHistory={analysisHistory} />;
      case 'Settings':
        return <SettingsView user={currentUser} />;
      default:
        return <AnalysisView />;
    }
  };

  if (!currentUser || !token) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <DashboardLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      user={currentUser}
      onLogout={handleLogout}
    >
      {renderActiveView()}
    </DashboardLayout>
  );
}

export default App;
