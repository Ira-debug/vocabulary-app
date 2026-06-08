import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { vocabularyBooks } from '../data/vocabularyBooks';

function LearnPage() {
  const { bookId, unitId } = useParams();
  const navigate = useNavigate();

  // 所有 hooks 在顶部
  const [phase, setPhase] = useState('learning');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentBatch, setCurrentBatch] = useState([]);

  // 获取数据
  const book = vocabularyBooks.find(b => b.id === bookId);
  const unit = book && book.units ? book.units.find(u => u.id === unitId) : null;

  // 初始化第一批单词
  useEffect(() => {
    if (unit && unit.words && unit.words.length > 0 && currentBatch.length === 0) {
      setCurrentBatch(unit.words.slice(0, 5));
    }
  }, [unit, currentBatch.length]);

  // 处理返回
  const handleBack = () => {
    navigate(`/book/${bookId}`);
  };

  // 处理下一个单词
  const handleNext = () => {
    if (currentIndex < currentBatch.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  // 渲染错误页面
  if (!book || !unit) {
    return (
      <div style={{ padding: 20, textAlign: 'center' }}>
        <h2>找不到该单词本或单元</h2>
        <p>bookId: {bookId}, unitId: {unitId}</p>
        <button onClick={() => navigate('/')}>返回首页</button>
      </div>
    );
  }

  // 渲染加载状态
  if (currentBatch.length === 0) {
    return (
      <div style={{ padding: 20, textAlign: 'center' }}>
        <p>正在加载...</p>
      </div>
    );
  }

  // 渲染学习页面
  const word = currentBatch[currentIndex];

  return (
    <div style={{ padding: 20 }}>
      <button onClick={handleBack}>← 返回</button>
      <h2>学习单词</h2>
      <p>{currentIndex + 1} / {currentBatch.length}</p>
      <div style={{ padding: 20, margin: 20, border: '1px solid #ccc', borderRadius: 10 }}>
        <h3 style={{ fontSize: 24 }}>{word.english}</h3>
        <p style={{ fontSize: 18, color: '#666' }}>{word.chinese}</p>
      </div>
      <button onClick={handleNext} style={{ padding: 10, fontSize: 16 }}>
        下一个
      </button>
    </div>
  );
}

export default LearnPage;