import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProgress } from '../context/ProgressContext';
import { vocabularyBooks } from '../data/vocabularyBooks';
import audioService from '../utils/audioService';

const PHASES = {
  LEARNING: 'learning',
  PRACTICE: 'practice',
  TEST: 'test',
  COMPLETE: 'complete'
};

function LearnPage() {
  const { bookId, unitId } = useParams();
  const navigate = useNavigate();
  const { updateProgress, getUnitProgress, addWrongWord } = useProgress();

  const [phase, setPhase] = useState(PHASES.LEARNING);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentBatch, setCurrentBatch] = useState([]);
  const [learnedInBatch, setLearnedInBatch] = useState([]);
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [testConnections, setTestConnections] = useState({});
  const [selectedWord, setSelectedWord] = useState(null);
  const [testComplete, setTestComplete] = useState(false);

  // 拼写练习相关状态
  const [spellingInput, setSpellingInput] = useState('');
  const [isCorrect, setIsCorrect] = useState(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [practiceWords, setPracticeWords] = useState([]);
  const recognitionRef = useRef(null);

  // 获取数据
  const book = vocabularyBooks.find(b => b.id === bookId);
  const unit = book?.units.find(u => u.id === unitId);

  // 获取进度，找出未学习的单词
  const unitProgress = getUnitProgress(bookId, unitId, unit);
  const learnedWordIds = unitProgress.learnedWords || [];
  const unlearnedWords = unit?.words.filter(w => !learnedWordIds.includes(w.id)) || [];

  // 初始化第一批单词
  useEffect(() => {
    if (unlearnedWords.length > 0 && currentBatch.length === 0) {
      const batch = unlearnedWords.slice(0, 5);
      setCurrentBatch(batch);
    }
  }, [unlearnedWords]);

  // 学习阶段 - 自动播放发音
  useEffect(() => {
    if (phase === PHASES.LEARNING && currentBatch.length > 0 && currentIndex < currentBatch.length) {
      const word = currentBatch[currentIndex];
      audioService.speakWord(word.english).catch(() => {});
    }
  }, [phase, currentIndex, currentBatch]);

  // 练习阶段 - 不自动播放发音，等用户拼写正确后再播放

  // 初始化语音识别
  useEffect(() => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setSpellingInput(transcript.toLowerCase().trim());
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  // 播放发音
  const handleSpeak = async () => {
    const word = currentBatch[currentIndex];
    await audioService.speakWord(word.english);
  };

  // 下一个单词
  const handleNextWord = () => {
    const word = currentBatch[currentIndex];
    updateProgress(bookId, unitId, word.id);
    setLearnedInBatch(prev => [...prev, word]);

    if (currentIndex < currentBatch.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // 学习完本批次，进入练习
      setPhase(PHASES.PRACTICE);
      initPracticeWords();
    }
  };

  // 初始化练习单词列表
  const initPracticeWords = useCallback(() => {
    const shuffled = [...learnedInBatch].sort(() => Math.random() - 0.5);
    setPracticeWords(shuffled);
    setPracticeIndex(0);
    setSpellingInput('');
    setIsCorrect(null);
    setCorrectCount(0);
  }, [learnedInBatch]);

  // 播放当前练习单词发音（拼写正确后调用）
  const handlePracticeSpeak = async () => {
    if (practiceWords.length > 0 && practiceIndex < practiceWords.length) {
      const word = practiceWords[practiceIndex];
      await audioService.speakWord(word.english);
    }
  };

  // 开始语音输入
  const handleStartListening = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  // 检查拼写
  const handleCheckSpelling = async () => {
    if (!spellingInput.trim()) return;

    const currentWord = practiceWords[practiceIndex];
    // 比较时忽略大小写和空格
    const isAnswerCorrect = spellingInput.toLowerCase().trim() === currentWord.english.toLowerCase().trim();
    setIsCorrect(isAnswerCorrect);

    if (isAnswerCorrect) {
      audioService.playCorrect();
      setCorrectCount(prev => prev + 1);
      // 拼写正确后才播放单词发音
      await audioService.speakWord(currentWord.english);

      // 等待一下让用户看到正确提示
      setTimeout(() => {
        if (practiceIndex < practiceWords.length - 1) {
          // 继续下一个练习
          setPracticeIndex(practiceIndex + 1);
          setSpellingInput('');
          setIsCorrect(null);
        } else {
          // 练习完成，播放欢呼声后进入测试
          audioService.speakEncouragement('correct').then(() => {
            setPhase(PHASES.TEST);
          });
        }
      }, 800);
    } else {
      audioService.playWrong();
      // 记录错词
      addWrongWord(bookId, currentWord);

      // 错误时抖动，然后重置让用户再试
      setTimeout(() => {
        setIsCorrect(null);
        setSpellingInput('');
      }, 1500);
    }
  };

  // 测试阶段 - 连连看
  const handleWordClick = (word) => {
    if (testConnections[word.id]) return;
    setSelectedWord(word);
  };

  const handleMeaningClick = async (meaning) => {
    if (!selectedWord) return;

    const correct = selectedWord.chinese === meaning;
    if (correct) {
      audioService.playCorrect();

      setTestConnections(prev => ({
        ...prev,
        [selectedWord.id]: meaning
      }));
      setSelectedWord(null);

      // 检查是否全部完成
      const completed = Object.keys(testConnections).length + 1 === practiceWords.length;
      setTestComplete(completed);
    } else {
      audioService.playWrong();
      setSelectedWord(null);
    }
  };

  // 测试完成后的处理
  const handleTestComplete = async () => {
    await audioService.speakEncouragement('correct');

    // 检查是否有更多未学习的单词
    const remainingWords = unlearnedWords.slice(currentBatch.length);
    if (remainingWords.length > 0) {
      setPhase(PHASES.LEARNING);
      setCurrentBatch(remainingWords.slice(0, 5));
      setCurrentIndex(0);
      setLearnedInBatch([]);
      setPracticeWords([]);
      setTestConnections({});
      setTestComplete(false);
      setCorrectCount(0);
    } else {
      setPhase(PHASES.COMPLETE);
    }
  };

  // 返回上一页
  const handleBack = () => {
    navigate(`/book/${bookId}`);
  };

  // 渲染学习阶段
  if (phase === PHASES.LEARNING && currentBatch.length > 0) {
    const word = currentBatch[currentIndex];
    const progressPercentage = Math.round((currentIndex / currentBatch.length) * 100);

    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-400 via-purple-400 to-pink-400 p-4 flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between py-4">
          <button onClick={handleBack} className="text-white text-xl">←</button>
          <div className="text-white text-xl">📝</div>
        </div>

        {/* 进度条 */}
        <div className="mb-4">
          <div className="flex justify-between text-white text-sm mb-1">
            <span>{currentIndex + 1}/{currentBatch.length}</span>
            <span>{progressPercentage}%</span>
          </div>
          <div className="h-3 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* 单词卡片 */}
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm">
            {/* 英文单词 + 喇叭图标 */}
            <div className="flex items-center justify-center gap-3 mb-4">
              <h2 className="text-4xl font-bold text-gray-800">
                {word.english}
              </h2>
              <button
                onClick={handleSpeak}
                className="w-12 h-12 rounded-full bg-blue-500 text-white flex items-center justify-center text-2xl active:scale-90 transition-transform shadow-lg"
              >
                🔊
              </button>
            </div>

            {/* 音标 */}
            {word.phonetic && (
              <p className="text-xl text-gray-500 text-center mb-4">
                {word.phonetic}
              </p>
            )}

            {/* 词性 */}
            {word.partOfSpeech && (
              <div className="text-center mb-4">
                <span className="inline-block px-3 py-1 bg-purple-100 text-purple-600 rounded-full text-sm font-medium">
                  {word.partOfSpeech}
                </span>
              </div>
            )}

            {/* 中文释义 */}
            <div className="bg-blue-100 rounded-2xl p-4 mb-4">
              <p className="text-2xl text-blue-600 text-center font-medium">
                {word.chinese}
              </p>
            </div>

            {/* 例句 */}
            {word.example && (
              <div className="bg-gray-100 rounded-xl p-3 mb-6">
                <p className="text-gray-600 text-center italic">
                  {word.example}
                </p>
              </div>
            )}

            {/* 下一个按钮 */}
            <button
              onClick={handleNextWord}
              className="w-full py-4 bg-green-500 text-white rounded-2xl text-xl font-bold active:scale-95 transition-transform flex items-center justify-center gap-2"
            >
              下一个 →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 渲染练习阶段 - 单词拼写
  if (phase === PHASES.PRACTICE && practiceWords.length > 0) {
    const currentWord = practiceWords[practiceIndex];

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-400 to-blue-500 p-4 flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between py-4">
          <button onClick={handleBack} className="text-white text-xl">←</button>
          <div className="text-white">
            拼写练习 ({practiceIndex + 1}/{practiceWords.length})
          </div>
          <div className="text-white text-xl">✍️</div>
        </div>

        {/* 题目 */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm mb-4">
            {/* 中文释义 */}
            <div className="bg-blue-100 rounded-2xl p-4 mb-4">
              <p className="text-2xl text-blue-600 text-center font-medium">
                {currentWord?.chinese}
              </p>
            </div>

            {/* 词性提示 */}
            {currentWord?.partOfSpeech && (
              <div className="text-center mb-4">
                <span className="inline-block px-3 py-1 bg-purple-100 text-purple-600 rounded-full text-sm font-medium">
                  {currentWord.partOfSpeech}
                </span>
              </div>
            )}

            {/* 输入框 */}
            <div className={`relative mb-4 ${isCorrect === false ? 'animate-wiggle' : ''}`}>
              <input
                type="text"
                value={spellingInput}
                onChange={(e) => setSpellingInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCheckSpelling()}
                placeholder="输入英文单词..."
                disabled={isCorrect !== null}
                className={`w-full py-4 px-6 rounded-2xl text-xl text-center font-bold border-2 transition-all ${
                  isCorrect === true
                    ? 'border-green-500 bg-green-50 text-green-600'
                    : isCorrect === false
                      ? 'border-red-500 bg-red-50 text-red-600'
                      : 'border-gray-300 bg-white text-gray-800 focus:border-blue-500'
                }`}
                autoFocus
              />
            </div>

            {/* 语音输入按钮 */}
            {recognitionRef.current && (
              <button
                onClick={handleStartListening}
                disabled={isListening || isCorrect !== null}
                className={`w-full py-3 rounded-2xl text-lg font-bold mb-4 transition-all flex items-center justify-center gap-2 ${
                  isListening
                    ? 'bg-purple-500 text-white animate-pulse'
                    : 'bg-purple-100 text-purple-600 active:scale-95'
                }`}
              >
                <span className="text-xl">🎤</span>
                {isListening ? '正在听...' : '语音输入'}
              </button>
            )}

            {/* 确认按钮 */}
            {spellingInput.trim() && isCorrect === null && (
              <button
                onClick={handleCheckSpelling}
                className="w-full py-4 bg-green-500 text-white rounded-2xl text-xl font-bold active:scale-95 transition-transform"
              >
                确认
              </button>
            )}

            {/* 正确答案提示 */}
            {isCorrect === false && (
              <div className="bg-yellow-100 rounded-xl p-3 mt-4">
                <p className="text-yellow-700 text-center">
                  正确答案：<span className="font-bold">{currentWord?.english}</span>
                </p>
              </div>
            )}

            {/* 提示 */}
            {isCorrect !== null && (
              <div className={`mt-4 text-xl font-bold text-center ${isCorrect ? 'text-green-300' : 'text-red-300'}`}>
                {isCorrect ? '✓ 正确！' : '✗ 再试一次！'}
              </div>
            )}
          </div>

          {/* 进度指示 */}
          <div className="flex gap-2 mt-2">
            {practiceWords.map((_, idx) => (
              <div
                key={idx}
                className={`w-3 h-3 rounded-full ${
                  idx < correctCount ? 'bg-green-300' :
                  idx === practiceIndex ? 'bg-white' :
                  'bg-white/40'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 渲染测试阶段 - 连连看
  if (phase === PHASES.TEST) {
    const shuffledMeanings = [...practiceWords]
      .map(w => w.chinese)
      .sort(() => Math.random() - 0.5);

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-400 to-pink-500 p-4 flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between py-4">
          <button onClick={handleBack} className="text-white text-xl">←</button>
          <div className="text-white">
            测试阶段 - 连连看
          </div>
          <div className="text-white text-xl">🔗</div>
        </div>

        {/* 进度 */}
        <div className="text-center text-white mb-4">
          已连接: {Object.keys(testConnections).length}/{practiceWords.length}
        </div>

        {/* 连连看区域 */}
        <div className="flex-1 flex gap-4 px-2">
          {/* 左侧 - 英文 */}
          <div className="flex-1 flex flex-col gap-3">
            {practiceWords.map(word => (
              <button
                key={word.id}
                onClick={() => handleWordClick(word)}
                disabled={testConnections[word.id]}
                className={`py-3 px-4 rounded-xl text-lg font-bold transition-all ${
                  testConnections[word.id]
                    ? 'bg-green-500 text-white'
                    : selectedWord?.id === word.id
                      ? 'bg-white text-gray-800 scale-105 ring-2 ring-yellow-400'
                      : 'bg-white/90 text-gray-800 active:scale-95'
                }`}
              >
                {word.english}
              </button>
            ))}
          </div>

          {/* 中间 - 连线 */}
          <div className="flex-1 flex flex-col justify-around">
            {practiceWords.map(word => (
              <div key={word.id} className="h-8 flex items-center justify-center">
                {testConnections[word.id] && (
                  <div className="w-full h-2 bg-green-400 rounded-full" />
                )}
              </div>
            ))}
          </div>

          {/* 右侧 - 中文 */}
          <div className="flex-1 flex flex-col gap-3">
            {shuffledMeanings.map((meaning, idx) => (
              <button
                key={idx}
                onClick={() => handleMeaningClick(meaning)}
                disabled={Object.values(testConnections).includes(meaning)}
                className={`py-3 px-4 rounded-xl text-lg font-bold transition-all ${
                  Object.values(testConnections).includes(meaning)
                    ? 'bg-green-500 text-white'
                    : 'bg-white/90 text-gray-800 active:scale-95'
                }`}
              >
                {meaning}
              </button>
            ))}
          </div>
        </div>

        {/* 完成提示 */}
        {testComplete && (
          <div className="mt-6 flex flex-col gap-3">
            <div className="bg-white rounded-2xl p-6 text-center">
              <h3 className="text-2xl font-bold text-green-600">🎉 太棒了！全部正确！</h3>
            </div>
            <button
              onClick={handleTestComplete}
              className="py-4 bg-yellow-400 text-gray-800 rounded-2xl text-xl font-bold active:scale-95 transition-transform"
            >
              {unlearnedWords.length > currentBatch.length ? '继续学习下一组 →' : '完成本单元 ✨'}
            </button>
          </div>
        )}
      </div>
    );
  }

  // 渲染完成阶段
  if (phase === PHASES.COMPLETE) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-400 to-orange-500 p-4 flex flex-col items-center justify-center">
        <div className="bg-white rounded-3xl shadow-2xl p-8 text-center">
          <h2 className="text-4xl mb-4">🎉</h2>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">恭喜你！</h3>
          <p className="text-gray-600 mb-6">本单元学习完成</p>

          <div className="flex gap-3">
            <button
              onClick={handleBack}
              className="py-4 px-6 bg-blue-500 text-white rounded-2xl text-xl font-bold active:scale-95 transition-transform"
            >
              返回单元列表
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 没有单词可学习
  if (unlearnedWords.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-400 to-purple-500 p-4 flex flex-col items-center justify-center">
        <div className="bg-white rounded-3xl shadow-2xl p-8 text-center">
          <h2 className="text-4xl mb-4">✨</h2>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">太棒了！</h3>
          <p className="text-gray-600 mb-6">本单元已经学完了，可以复习或学习其他单元</p>

          <div className="flex gap-3">
            <button
              onClick={() => {
                setCurrentBatch(unit.words.slice(0, 5));
                setPhase(PHASES.LEARNING);
                setCurrentIndex(0);
                setLearnedInBatch([]);
                setPracticeWords([]);
                setCorrectCount(0);
              }}
              className="py-4 px-6 bg-green-500 text-white rounded-2xl text-xl font-bold active:scale-95 transition-transform"
            >
              复习本单元
            </button>
            <button
              onClick={handleBack}
              className="py-4 px-6 bg-blue-500 text-white rounded-2xl text-xl font-bold active:scale-95 transition-transform"
            >
              返回
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default LearnPage;