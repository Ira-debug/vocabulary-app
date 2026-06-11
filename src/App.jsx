import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProgressProvider } from './context/ProgressContext';
import ErrorBoundary from './components/ErrorBoundary';
import HomePage from './pages/HomePage';
import UnitListPage from './pages/UnitListPage';
import LearnPage from './pages/LearnPage';
import WrongWordsPage from './pages/WrongWordsPage';
import LoginPage from './pages/LoginPage';

// 路由保护组件（可选登录）
function OptionalAuthRoute({ children }) {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 flex items-center justify-center">
        <div className="text-white text-xl">加载中...</div>
      </div>
    );
  }

  return children;
}

function App() {
  return (
    <AuthProvider>
      <ProgressProvider>
        <Router>
          <ErrorBoundary>
            <div className="min-h-screen">
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/" element={<OptionalAuthRoute><HomePage /></OptionalAuthRoute>} />
                <Route path="/book/:bookId" element={<OptionalAuthRoute><UnitListPage /></OptionalAuthRoute>} />
                <Route path="/learn/:bookId/:unitId" element={<OptionalAuthRoute><LearnPage /></OptionalAuthRoute>} />
                <Route path="/wrong-words/:bookId" element={<OptionalAuthRoute><WrongWordsPage /></OptionalAuthRoute>} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </ErrorBoundary>
        </Router>
      </ProgressProvider>
    </AuthProvider>
  );
}

export default App;