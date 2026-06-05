import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProgress } from '../context/ProgressContext';
import { vocabularyBooks } from '../data/vocabularyBooks';
import audioService from '../utils/audioService';

function WrongWordsPage() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const { getWrongWords, removeWrongWord } = useProgress();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showMeaning, setShowMeaning] = useState(false);

  const book = vocabularyBooks.find(b => b.id === bookId);
  const wrongWords = getWrongWords(bookId);

  // 获取所有单元的单词，用于查找完整信息
  const allWords = book?.units.flatMap(u => u.words) || [];
  const currentWord = wrongWords[currentIndex];

  // 下一个单词
  const handleNext = () => {
    if (currentIndex < wrongWords.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowMeaning(false);
    }
  };

  // 上一个单词
  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setShowMeaning(false);
    }
  };

  // 移除错词（已掌握）
  const handleMastered = () => {
    if (currentWord) {
      removeWrongWord(bookId, currentWord.id);
      if (currentIndex >= wrongWords.length - 1) {
        setCurrentIndex(Math.max(0, currentIndex - 1));
      }
      setShowMeaning(false);
    }
  };

  if (wrongWords.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-400 to-pink-500 p-4 flex flex-col items-center justify-center">
        <div className="bg-white rounded-3xl shadow-2xl p-8 text-center">
          <h2 className="text-4xl mb-4">🎉</h2>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">太棒了！</h3>
          <p className="text-gray-600 mb-6">没有错词，继续保持！</p>
          <button
            onClick={() => navigate(`/book/${bookId}`)}
            className="py-4 px-6 bg-blue-500 text-white rounded-2xl text-xl font-bold active:scale-95 transition-transform"
          >
            返回
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-400 to-pink-500 p-4 flex flex-col">
      {/* 头部 */}
      <div className="flex items-center gap-3 py-4">
        <button
          onClick={() => navigate(`/book/${bookId}`)}
          className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white"
        >
          ←
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">❌ 错词本</h1>
          <p className="text-white/80 text-sm">
            {wrongWords.length} 个单词需要复习
          </p>
        </div>
      </div>

      {/* 进度 */}
      <div className="text-center text-white mb-4">
        {currentIndex + 1} / {wrongWords.length}
      </div>

      {/* 单词卡片 */}
      <div className="flex-1 flex items-center justify-center">
        <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm">
          {/* 英文单词 */}
          <h2 className="text-4xl font-bold text-center text-gray-800 mb-4">
            {currentWord?.english}
          </h2>

          {/* 音标 */}
          <p className="text-xl text-gray-500 text-center mb-4">
            {currentWord?.phonetic}
          </p>

          {/* 显示/隐藏中文 */}
          {showMeaning ? (
            <div className="bg-red-100 rounded-2xl p-4 mb-4">
              <p className="text-2xl text-red-600 text-center font-medium">
                {currentWord?.chinese}
              </p>
            </div>
          ) : (
            <button
              onClick={() => setShowMeaning(true)}
              className="w-full py-4 bg-gray-100 rounded-2xl text-gray-600 text-xl mb-4 active:scale-95"
            >
              点击显示释义
            </button>
          )}

          {/* 例句 */}
          {showMeaning && (
            <div className="bg-gray-100 rounded-xl p-3 mb-6">
              <p className="text-gray-600 text-center italic">
                {currentWord?.example}
              </p>
            </div>
          )}

          {/* 按钮区 */}
          <div className="flex gap-3 mb-4">
            <button
              onClick={() => audioService.speakWord(currentWord?.english)}
              className="flex-1 py-4 bg-blue-500 text-white rounded-2xl text-xl font-bold active:scale-95 transition-transform flex items-center justify-center gap-2"
            >
              🔊 发音
            </button>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="flex-1 py-3 bg-gray-200 text-gray-600 rounded-2xl text-lg font-bold disabled:opacity-50"
            >
              上一个
            </button>
            <button
              onClick={handleNext}
              disabled={currentIndex === wrongWords.length - 1}
              className="flex-1 py-3 bg-gray-200 text-gray-600 rounded-2xl text-lg font-bold disabled:opacity-50"
            >
              下一个
            </button>
          </div>

          {/* 已掌握按钮 */}
          <button
            onClick={handleMastered}
            className="w-full mt-4 py-4 bg-green-500 text-white rounded-2xl text-xl font-bold active:scale-95 transition-transform"
          >
            ✓ 已掌握，移除错词
          </button>
        </div>
      </div>
    </div>
  );
}

export default WrongWordsPage;