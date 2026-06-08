import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { ProgressProvider } from './context/ProgressContext';
import ErrorBoundary from './components/ErrorBoundary';
import HomePage from './pages/HomePage';
import UnitListPage from './pages/UnitListPage';
import LearnPage from './pages/LearnPage';
import WrongWordsPage from './pages/WrongWordsPage';

function App() {
  return (
    <ProgressProvider>
      <Router>
        <ErrorBoundary>
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