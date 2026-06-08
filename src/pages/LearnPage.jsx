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

const PRACTICE_MODES = {
  SPELLING: 'spelling',  // 拼写模式（四年级下册）
  CHOICE: 'choice'       // 选择题模式（其他单词本）
};

function LearnPage() {
  const { bookId, unitId } = useParams();
  const navigate = useNavigate();
  const { updateProgress, getUnitProgress, addWrongWord } = useProgress();

  // 所有 state hooks 必须在组件顶部
  const [phase, setPhase] = useState(PHASES.LEARNING);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentBatch, setCurrentBatch] = useState([]);
  const [learnedInBatch, setLearnedInBatch] = useState([]);
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [testConnections, setTestConnections] = useState({});
  const [selectedWord, setSelectedWord] = useState(null);
  const [testComplete, setTestComplete] = useState(false);
  const [testWords, setTestWords] = useState([]);
  const [testMeanings, setTestMeanings] = useState([]);

  const [spellingInput, setSpellingInput] = useState('');
  const [isCorrect, setIsCorrect] = useState(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [practiceWords, setPracticeWords] = useState([]);
  const recognitionRef = useRef(null);
  const allLearnedIdsRef = useRef([]);
  const learnedInBatchRef = useRef([]);

  const [selectedOption, setSelectedOption] = useState(null);
  const [practiceOptions, setPracticeOptions] = useState([]);
  const [practiceMode, setPracticeMode] = useState(PRACTICE_MODES.CHOICE);
  const [allLearnedIds, setAllLearnedIds] = useState([]);

  // 获取数据 - 在 hooks 之后
  const book = vocabularyBooks.find(b => b.id === bookId);
  const unit = book?.units?.find(u => u.id === unitId);

  // 获取进度 - 使用安全访问
  const unitProgress = unit ? getUnitProgress(bookId, unitId, unit) : { learnedWords: [], learned: 0, total: 0, percentage: 0 };
  const learnedWordIds = unitProgress.learnedWords || [];
  const unlearnedWords = unit?.words?.filter(w => !learnedWordIds.includes(w.id)) || [];

  // 初始化已学习的单词ID列表（包含之前学习过的）
  useEffect(() => {
    if (learnedWordIds.length > 0 && allLearnedIdsRef.current.length === 0) {
      allLearnedIdsRef.current = learnedWordIds;
      setAllLearnedIds(learnedWordIds);
    }
  }, [learnedWordIds]);

  // 获取真正未学习的单词（使用 ref 确保同步）
  const getTrulyUnlearnedWords = () => {
    const learnedIds = allLearnedIdsRef.current;
    return unit?.words.filter(w => !learnedIds.includes(w.id)) || [];
  };

  // 用于渲染的未学习单词列表
  const trulyUnlearnedWords = getTrulyUnlearnedWords();

  // 初始化第一批单词
  useEffect(() => {
    const unlearned = getTrulyUnlearnedWords();
    if (unlearned.length > 0 && currentBatch.length === 0 && phase === PHASES.LEARNING) {
      setCurrentBatch(unlearned.slice(0, 5));
    }
  }, [phase, allLearnedIds]);  // 只依赖 phase 和 allLearnedIds state

  // 学习阶段 - 自动播放发音
  useEffect(() => {
    if (phase === PHASES.LEARNING && currentBatch.length > 0 && currentIndex < currentBatch.length) {
      const word = currentBatch[currentIndex];
      audioService.speakWord(word.english).catch(() => {});
    }
  }, [phase, currentIndex, currentBatch]);

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
    // 同时更新 ref 和 state，确保同步
    learnedInBatchRef.current = [...learnedInBatchRef.current, word];
    setLearnedInBatch(prev => [...prev, word]);
    allLearnedIdsRef.current = [...allLearnedIdsRef.current, word.id];
    setAllLearnedIds(prev => [...prev, word.id]);

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
    // 使用 ref 确保获取到完整的本批次单词
    const shuffled = [...learnedInBatchRef.current].sort(() => Math.random() - 0.5);
    setPracticeWords(shuffled);
    setPracticeIndex(0);
    setSpellingInput('');
    setIsCorrect(null);
    setCorrectCount(0);
    setSelectedOption(null);

    // 根据单词本决定练习模式
    if (bookId === 'grade-4-down') {
      setPracticeMode(PRACTICE_MODES.SPELLING);
    } else {
      setPracticeMode(PRACTICE_MODES.CHOICE);
      generatePracticeOptions(shuffled[0]);
    }
  }, [bookId, generatePracticeOptions]);

  // 生成选择题选项
  const generatePracticeOptions = useCallback((currentWord) => {
    if (!currentWord || !unit) return;
    // 获取其他单词作为干扰项
    const otherWords = unit.words.filter(w => w.id !== currentWord.id);
    const shuffledOthers = otherWords.sort(() => Math.random() - 0.5).slice(0, 3);
    const allOptions = [...shuffledOthers, currentWord].sort(() => Math.random() - 0.5);
    setPracticeOptions(allOptions);
  }, [unit]);

  // 更新选择题选项（当练习索引变化时）
  useEffect(() => {
    if (phase === PHASES.PRACTICE && practiceMode === PRACTICE_MODES.CHOICE && practiceWords.length > 0) {
      const currentWord = practiceWords[practiceIndex];
      if (currentWord) {
        generatePracticeOptions(currentWord);
      }
    }
  }, [phase, practiceMode, practiceIndex, practiceWords, generatePracticeOptions]);

  // 进入测试阶段时，初始化随机排序（只执行一次）
  useEffect(() => {
    if (phase === PHASES.TEST && practiceWords.length > 0 && testWords.length === 0) {
      // 随机排序单词
      const shuffledWords = [...practiceWords].sort(() => Math.random() - 0.5);

      // 中文释义：练习单词的释义 + 2个干扰项
      const meanings = [...practiceWords].map(w => w.chinese);
      // 从单元中其他单词获取干扰项
      if (unit && unit.words.length > practiceWords.length) {
        const otherWords = unit.words.filter(w => !practiceWords.find(p => p.id === w.id));
        const distractors = otherWords
          .sort(() => Math.random() - 0.5)
          .slice(0, 2)
          .map(w => w.chinese);
        meanings.push(...distractors);
      }
      // 随机排序释义
      const shuffledMeanings = meanings.sort(() => Math.random() - 0.5);

      setTestWords(shuffledWords);
      setTestMeanings(shuffledMeanings);
    }
  }, [phase, practiceWords, testWords.length, unit]);

  // 测试完成时自动播放欢呼并跳转
  useEffect(() => {
    if (testComplete) {
      // 播放鼓励语音
      audioService.speakWord('易小城，你太厉害了', 'zh-CN').then(() => {
        handleTestComplete();
      });
    }
  }, [testComplete]);

  // 开始语音输入
  const handleStartListening = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  // 检查拼写（拼写模式）
  const handleCheckSpelling = async () => {
    if (!spellingInput.trim()) return;

    const currentWord = practiceWords[practiceIndex];
    const isAnswerCorrect = spellingInput.toLowerCase().trim() === currentWord.english.toLowerCase().trim();
    setIsCorrect(isAnswerCorrect);

    if (isAnswerCorrect) {
      audioService.playCorrect();
      setCorrectCount(prev => prev + 1);
      await audioService.speakWord(currentWord.english);

      setTimeout(() => {
        if (practiceIndex < practiceWords.length - 1) {
          setPracticeIndex(practiceIndex + 1);
          setSpellingInput('');
          setIsCorrect(null);
        } else {
          audioService.speakEncouragement('correct').then(() => {
            setPhase(PHASES.TEST);
          });
        }
      }, 800);
    } else {
      audioService.playWrong();
      addWrongWord(bookId, currentWord);

      setTimeout(() => {
        setIsCorrect(null);
        setSpellingInput('');
      }, 1500);
    }
  };

  // 选择题模式 - 选择选项
  const handleSelectOption = async (option) => {
    const currentWord = practiceWords[practiceIndex];
    const correct = option.id === currentWord.id;

    setSelectedOption(option.id);
    setIsCorrect(correct);

    if (correct) {
      audioService.playCorrect();
      // 答对后播放单词发音
      await audioService.speakWord(currentWord.english);

      setTimeout(() => {
        if (practiceIndex < practiceWords.length - 1) {
          setPracticeIndex(practiceIndex + 1);
          setSelectedOption(null);
          setIsCorrect(null);
        } else {
          audioService.speakEncouragement('correct').then(() => {
            setPhase(PHASES.TEST);
          });
        }
      }, 800);
    } else {
      audioService.playWrong();
      addWrongWord(bookId, currentWord);

      setTimeout(() => {
        setSelectedOption(null);
        setIsCorrect(null);
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
      // 连对后播放单词发音
      await audioService.speakWord(selectedWord.english);

      setTestConnections(prev => ({
        ...prev,
        [selectedWord.id]: meaning
      }));
      setSelectedWord(null);

      const completed = Object.keys(testConnections).length + 1 === practiceWords.length;
      setTestComplete(completed);
    } else {
      audioService.playWrong();
      setSelectedWord(null);
    }
  };

  // 测试完成后的处理
  const handleTestComplete = async () => {
    // 使用 ref 立即获取最新的已学习单词列表
    const learnedIds = allLearnedIdsRef.current;
    const remainingWords = unit?.words.filter(w => !learnedIds.includes(w.id)) || [];

    if (remainingWords.length > 0) {
      setPhase(PHASES.LEARNING);
      setCurrentBatch(remainingWords.slice(0, 5));
      setCurrentIndex(0);
      setLearnedInBatch([]);
      learnedInBatchRef.current = [];  // 清空本批次学习的 ref
      setPracticeWords([]);
      setTestConnections({});
      setTestComplete(false);
      setCorrectCount(0);
      setSelectedOption(null);
      setTestWords([]);
      setTestMeanings([]);
    } else {
      setPhase(PHASES.COMPLETE);
    }
  };

  // 返回上一页
  const handleBack = () => {
    navigate(`/book/${bookId}`);
  };

  // 渲染部分 - 先检查 book/unit 是否存在
  if (!book || !unit) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-400 to-orange-500 p-4 flex flex-col items-center justify-center">
        <div className="bg-white rounded-3xl shadow-2xl p-8 text-center">
          <h2 className="text-4xl mb-4">❌</h2>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">页面不存在</h3>
          <p className="text-gray-600 mb-6">找不到该单词本或单元</p>
          <button
            onClick={() => navigate('/')}
            className="py-4 px-6 bg-blue-500 text-white rounded-2xl text-xl font-bold active:scale-95 transition-transform"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

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

  // 渲染练习阶段 - 拼写模式（四年级下册）
  if (phase === PHASES.PRACTICE && practiceMode === PRACTICE_MODES.SPELLING && practiceWords.length > 0) {
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

  // 渲染练习阶段 - 选择题模式（其他单词本）
  if (phase === PHASES.PRACTICE && practiceMode === PRACTICE_MODES.CHOICE && practiceWords.length > 0) {
    const currentWord = practiceWords[practiceIndex];

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-400 to-blue-500 p-4 flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between py-4">
          <button onClick={handleBack} className="text-white text-xl">←</button>
          <div className="text-white">
            练习阶段 ({practiceIndex + 1}/{practiceWords.length})
          </div>
          <div className="text-white text-xl">🎯</div>
        </div>

        {/* 题目 */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm mb-6">
            {/* 英文单词 */}
            <div className="flex items-center justify-center gap-3 mb-4">
              <h2 className="text-3xl font-bold text-gray-800">
                {currentWord?.english}
              </h2>
              <button
                onClick={() => audioService.speakWord(currentWord?.english)}
                className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center text-xl active:scale-90 transition-transform"
              >
                🔊
              </button>
            </div>

            {/* 词性 */}
            {currentWord?.partOfSpeech && (
              <div className="text-center mb-4">
                <span className="inline-block px-3 py-1 bg-purple-100 text-purple-600 rounded-full text-sm font-medium">
                  {currentWord.partOfSpeech}
                </span>
              </div>
            )}

            <p className="text-gray-500 text-center mb-6">选择正确的中文释义</p>

            {/* 选项 */}
            <div className="grid grid-cols-2 gap-3">
              {practiceOptions.map(option => (
                <button
                  key={option.id}
                  onClick={() => handleSelectOption(option)}
                  disabled={selectedOption && selectedOption !== option.id}
                  className={`py-4 px-4 rounded-2xl text-lg font-bold transition-all border-2 shadow-md ${
                    selectedOption === option.id
                      ? isCorrect
                        ? 'bg-green-500 text-white border-green-500 scale-105'
                        : 'bg-red-500 text-white border-red-500 animate-wiggle'
                      : 'bg-blue-50 text-gray-800 border-blue-300 hover:bg-blue-100 active:scale-95'
                  } ${selectedOption && selectedOption !== option.id ? 'opacity-50' : ''}`}
                >
                  {option.chinese}
                </button>
              ))}
            </div>
          </div>

          {/* 进度指示 */}
          <div className="flex gap-2 mt-2">
            {practiceWords.map((_, idx) => (
              <div
                key={idx}
                className={`w-3 h-3 rounded-full ${
                  idx < practiceIndex ? 'bg-green-300' :
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
  if (phase === PHASES.TEST && testWords.length > 0) {
    // 计算每个英文单词对应的中文释义索引
    const getMeaningIndex = (wordId) => {
      const word = testWords.find(w => w.id === wordId);
      if (!word) return -1;
      return testMeanings.findIndex(m => m === word.chinese);
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-400 to-pink-500 p-2 flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between py-2">
          <button onClick={handleBack} className="text-white text-lg">←</button>
          <div className="text-white text-sm">
            测试阶段 - 连连看 ({Object.keys(testConnections).length}/{testWords.length})
          </div>
          <div className="text-white text-lg">🔗</div>
        </div>

        {/* 连连看区域 - 使用相对定位 */}
        <div className="flex-1 relative px-1">
          {/* SVG 连线层 */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 5 }}>
            {Object.entries(testConnections).map(([wordId, meaning]) => {
              const wordIndex = testWords.findIndex(w => w.id === wordId);
              const meaningIndex = testMeanings.findIndex(m => m === meaning);
              if (wordIndex === -1 || meaningIndex === -1) return null;

              // 计算连线位置（百分比）
              const y1 = (wordIndex + 0.5) / testWords.length * 100;
              const y2 = (meaningIndex + 0.5) / testMeanings.length * 100;

              return (
                <line
                  key={wordId}
                  x1="15%"
                  y1={`${y1}%`}
                  x2="85%"
                  y2={`${y2}%`}
                  stroke="#22c55e"
                  strokeWidth="2"
                  strokeLinecap="round"
                  className="animate-draw-line"
                />
              );
            })}
          </svg>

          {/* 左侧 - 英文 */}
          <div className="absolute left-0 top-0 w-[28%] h-full flex flex-col gap-1" style={{ zIndex: 10 }}>
            {testWords.map(word => (
              <button
                key={word.id}
                onClick={() => handleWordClick(word)}
                disabled={testConnections[word.id]}
                className={`flex-1 py-1 px-2 rounded-lg text-sm font-bold transition-all ${
                  testConnections[word.id]
                    ? 'bg-green-500 text-white'
                    : selectedWord?.id === word.id
                      ? 'bg-white text-gray-800 ring-2 ring-yellow-400'
                      : 'bg-white/90 text-gray-800 active:scale-95'
                }`}
              >
                {word.english}
              </button>
            ))}
          </div>

          {/* 右侧 - 中文 */}
          <div className="absolute right-0 top-0 w-[28%] h-full flex flex-col gap-1" style={{ zIndex: 10 }}>
            {testMeanings.map((meaning, idx) => (
              <button
                key={idx}
                onClick={() => handleMeaningClick(meaning)}
                disabled={Object.values(testConnections).includes(meaning)}
                className={`flex-1 py-1 px-2 rounded-lg text-sm font-bold transition-all ${
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

        {/* 完成提示 - 自动跳转，不需要按钮 */}
        {testComplete && (
          <div className="mt-6">
            <div className="bg-white rounded-2xl p-6 text-center">
              <h3 className="text-2xl font-bold text-green-600">🎉 太棒了！全部正确！</h3>
              <p className="text-gray-500 mt-2">正在进入下一环节...</p>
            </div>
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
  if (trulyUnlearnedWords.length === 0 && currentBatch.length === 0) {
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
                setSelectedOption(null);
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

  // 加载状态或默认状态
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 to-purple-500 p-4 flex flex-col items-center justify-center">
      <div className="bg-white rounded-3xl shadow-2xl p-8 text-center">
        <h2 className="text-4xl mb-4">📚</h2>
        <p className="text-gray-600">正在加载...</p>
      </div>
    </div>
  );
}

export default LearnPage;