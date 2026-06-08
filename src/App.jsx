import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { ProgressProvider } from './context/ProgressContext';
import ErrorBoundary from './components/ErrorBoundary';
import HomePage from './pages/HomePage';
import UnitListPage from './pages/UnitListPage';
import LearnPage from './pages/LearnPage';
import WrongWordsPage from './pages/WrongWordsPage';
import audioService from './utils/audioService';

// 初始化音频服务（iOS Safari 需要预先加载语音）
function AudioInitializer() {
  useEffect(() => {
    // 在应用启动时加载语音列表
    audioService.loadVoices();
  }, []);
  return null;
}

function App() {
  return (
    <ProgressProvider>
      <Router>
        <ErrorBoundary>
          <AudioInitializer />
          <div className="min-h-screen">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/book/:bookId" element={<UnitListPage />} />
              <Route path="/learn/:bookId/:unitId" element={<LearnPage />} />
              <Route path="/wrong-words/:bookId" element={<WrongWordsPage />} />
            </Routes>
          </div>
        </ErrorBoundary>
      </Router>
    </ProgressProvider>
  );
}

export default App;