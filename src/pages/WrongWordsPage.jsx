import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProgress } from '../context/ProgressContext';
import { vocabularyBooks } from '../data/vocabularyBooks';
import audioService from '../utils/audioService';

// 洗牌函数
const shuffle = (array) => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

function WrongWordsPage() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const { getWrongWords } = useProgress();

  const [mode, setMode] = useState('browse'); // browse 或 practice
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showMeaning, setShowMeaning] = useState(false);

  // 练习模式状态
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [options, setOptions] = useState([]);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showAnswerResult, setShowAnswerResult] = useState(false);

  const book = vocabularyBooks.find(b => b.id === bookId);
  const wrongWords = getWrongWords(bookId);

  // 获取所有单元的单词，用于生成干扰项
  const allWords = book?.units.flatMap(u => u.words) || [];
  const currentWord = mode === 'browse' ? wrongWords[currentIndex] : wrongWords[practiceIndex];

  // 生成练习选项
  const generateOptions = useCallback((currentWord) => {
    if (!allWords.length || !currentWord) return [];
    const otherWords = allWords.filter(w => w.id !== currentWord.id);
    const distractors = shuffle(otherWords).slice(0, 3);
    const allOptions = shuffle([currentWord, ...distractors]);
    return allOptions.map(w => ({
      chinese: w.chinese,
      isCorrect: w.id === currentWord.id,
      wordId: w.id
    }));
  }, [allWords]);

  // 开始练习
  const startPractice = () => {
    setMode('practice');
    setPracticeIndex(0);
    setSelectedAnswer(null);
    setShowAnswerResult(false);
    if (wrongWords.length > 0) {
      setOptions(generateOptions(wrongWords[0]));
    }
  };

  // 选择答案
  const handleSelectAnswer = (option) => {
    if (showAnswerResult) return;

    setSelectedAnswer(option);
    setShowAnswerResult(true);

    if (option.isCorrect) {
      audioService.playCorrect();
      audioService.speakWord(currentWord.english);

      setTimeout(() => {
        if (practiceIndex < wrongWords.length - 1) {
          setPracticeIndex(practiceIndex + 1);
          setOptions(generateOptions(wrongWords[practiceIndex + 1]));
          setSelectedAnswer(null);
          setShowAnswerResult(false);
        } else {
          // 练习完成
          audioService.speakPraise('易小城');
          setMode('complete');
        }
      }, 1500);
    } else {
      audioService.playWrong();
    }
  };

  // 下一个单词（浏览模式）
  const handleNext = () => {
    if (currentIndex < wrongWords.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowMeaning(false);
    }
  };

  // 上一个单词（浏览模式）
  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setShowMeaning(false);
    }
  };

  if (wrongWords.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-300 to-pink-400 p-4 flex flex-col items-center justify-center">
        <div className="bg-white rounded-3xl shadow-2xl p-8 text-center">
          <h2 className="text-4xl mb-4">🎉</h2>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">太棒了！</h3>
          <p className="text-gray-600 mb-6">没有错词，继续保持！</p>
          <button
            onClick={() => navigate(`/book/${bookId}`)}
            className="py-4 px-6 bg-orange-500 text-white rounded-2xl text-xl font-bold active:scale-95 transition-transform"
          >
            返回
          </button>
        </div>
      </div>
    );
  }

  // 练习完成页面
  if (mode === 'complete') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-400 via-orange-400 to-pink-400 p-4 flex flex-col items-center justify-center">
        <div className="bg-white rounded-3xl shadow-2xl p-8 text-center">
          <h2 className="text-5xl mb-4 animate-bounce-soft">🏆</h2>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">练习完成！</h3>
          <p className="text-gray-600 mb-6">共练习 {wrongWords.length} 个错词</p>
          <div className="flex gap-4">
            <button
              onClick={() => navigate(`/book/${bookId}`)}
              className="py-3 px-6 bg-gray-200 text-gray-700 rounded-2xl font-bold active:scale-95 transition-transform"
            >
              返回
            </button>
            <button
              onClick={startPractice}
              className="py-3 px-6 bg-orange-500 text-white rounded-2xl font-bold active:scale-95 transition-transform"
            >
              再练一次
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 练习模式
  if (mode === 'practice') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-400 via-emerald-400 to-teal-400 p-4 flex flex-col">
        {/* 头部 */}
        <div className="flex items-center gap-3 py-4">
          <button
            onClick={() => setMode('browse')}
            className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white"
          >
            ←
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">错词练习</h1>
            <p className="text-white/80 text-sm">
              {practiceIndex + 1} / {wrongWords.length}
            </p>
          </div>
        </div>

        {/* 单词卡片 */}
        <div className="flex-1 flex items-center justify-center">
          <div className="card-kid rounded-2xl p-6 w-full max-w-sm">
            {/* 英文单词 */}
            <div
              onClick={() => audioService.speakWord(currentWord?.english)}
              className="text-center cursor-pointer mb-6"
            >
              <h2 className="text-3xl font-bold text-gray-800">
                {currentWord?.english}
                <span className="ml-2 text-xl opacity-60">🔊</span>
              </h2>
            </div>

            {/* 选项 */}
            <div className="space-y-3">
              {options.map((option, index) => {
                const isSelectedWrong = selectedAnswer && !selectedAnswer.isCorrect && selectedAnswer.wordId === option.wordId;
                const isCorrectSelected = showAnswerResult && selectedAnswer?.isCorrect && option.isCorrect;
                const isDisabled = showAnswerResult && selectedAnswer?.isCorrect;

                return (
                  <button
                    key={index}
                    onClick={() => handleSelectAnswer(option)}
                    disabled={isDisabled}
                    className={`w-full p-4 text-center text-lg rounded-xl transition-all active:scale-98 ${
                      isCorrectSelected
                        ? 'bg-green-100 text-green-700 border-2 border-green-400 shadow-sm'
                        : isSelectedWrong
                          ? 'bg-red-100 text-red-700 border-2 border-red-400'
                          : 'bg-purple-50 text-gray-700 hover:bg-purple-100 border-2 border-purple-200'
                    } ${isDisabled ? 'cursor-default' : 'cursor-pointer'}`}
                  >
                    {option.chinese}
                  </button>
                );
              })}
            </div>

            {selectedAnswer && !selectedAnswer.isCorrect && !showAnswerResult && (
              <p className="text-center text-orange-600 mt-4 font-medium">再试一次！</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 浏览模式
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-300 to-pink-400 p-4 flex flex-col">
      {/* 头部 */}
      <div className="flex items-center gap-3 py-4">
        <button
          onClick={() => navigate(`/book/${bookId}`)}
          className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white"
        >
          ←
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">📝 错词浏览</h1>
          <p className="text-white/80 text-sm">
            {wrongWords.length} 个单词
          </p>
        </div>
      </div>

      {/* 进度 */}
      <div className="text-center text-white mb-4">
        {currentIndex + 1} / {wrongWords.length}
      </div>

      {/* 单词卡片 */}
      <div className="flex-1 flex items-center justify-center">
        <div className="card-kid rounded-2xl p-6 w-full max-w-sm">
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
            <div className="bg-orange-100 rounded-2xl p-4 mb-4">
              <p className="text-2xl text-orange-600 text-center font-medium">
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
          {showMeaning && currentWord?.example && (
            <div className="bg-gray-100 rounded-xl p-3 mb-6">
              <p className="text-gray-600 text-center italic">
                {currentWord?.example}
              </p>
            </div>
          )}

          {/* 发音按钮 */}
          <button
            onClick={() => audioService.speakWord(currentWord?.english)}
            className="w-full py-4 bg-blue-500 text-white rounded-2xl text-xl font-bold active:scale-95 transition-transform flex items-center justify-center gap-2 mb-4"
          >
            🔊 发音
          </button>

          {/* 导航按钮 */}
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

          {/* 开始练习按钮 */}
          <button
            onClick={startPractice}
            className="w-full mt-4 py-4 bg-orange-500 text-white rounded-2xl text-xl font-bold active:scale-95 transition-transform"
          >
            开始练习
          </button>
        </div>
      </div>
    </div>
  );
}

export default WrongWordsPage;