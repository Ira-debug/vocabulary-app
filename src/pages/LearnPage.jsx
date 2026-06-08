import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { vocabularyBooks } from '../data/vocabularyBooks';
import audioService from '../utils/audioService';
import { useProgress } from '../context/ProgressContext';

// 洗牌函数
const shuffle = (array) => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

// 批次大小
const BATCH_SIZE = 5;

// 获取学习位置 key
const getLearningPositionKey = (bookId, unitId) => `learning-position-${bookId}-${unitId}`;

// 保存学习位置
const saveLearningPosition = (bookId, unitId, batchIndex, currentIndex) => {
  const key = getLearningPositionKey(bookId, unitId);
  localStorage.setItem(key, JSON.stringify({ batchIndex, currentIndex, savedAt: Date.now() }));
};

// 获取学习位置
const getLearningPosition = (bookId, unitId) => {
  const key = getLearningPositionKey(bookId, unitId);
  const saved = localStorage.getItem(key);
  return saved ? JSON.parse(saved) : null;
};

// 清除学习位置
const clearLearningPosition = (bookId, unitId) => {
  const key = getLearningPositionKey(bookId, unitId);
  localStorage.removeItem(key);
};

function LearnPage() {
  const { bookId, unitId } = useParams();
  const navigate = useNavigate();
  const { getUnitProgress, updateProgress, addWrongWord } = useProgress();

  // 批次管理
  const [batchIndex, setBatchIndex] = useState(0);
  const [allWords, setAllWords] = useState([]);
  const [currentBatch, setCurrentBatch] = useState([]);

  // 学习阶段状态
  const [phase, setPhase] = useState('learning');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showDetail, setShowDetail] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // 测试阶段状态
  const [testIndex, setTestIndex] = useState(0);
  const [testResults, setTestResults] = useState([]);
  const [options, setOptions] = useState([]);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showAnswerResult, setShowAnswerResult] = useState(false);
  const [wrongAttempts, setWrongAttempts] = useState({});

  // 连连看状态
  const [matchingWords, setMatchingWords] = useState([]);
  const [matchingOptions, setMatchingOptions] = useState([]);
  const [matchedPairs, setMatchedPairs] = useState([]);
  const [selectedWord, setSelectedWord] = useState(null);
  const [selectedMeaning, setSelectedMeaning] = useState(null);
  const [matchingWrongAttempts, setMatchingWrongAttempts] = useState(0);
  const [matchingRoundComplete, setMatchingRoundComplete] = useState(false); // 本轮完成等待点击

  // 连连看轮次管理（分2轮完成整组单词）
  const [matchingRound, setMatchingRound] = useState(1); // 当前轮次
  const [remainingWords, setRemainingWords] = useState([]); // 剩余待匹配的单词

  // 全部测试结果
  const [allResults, setAllResults] = useState([]);

  // 获取数据
  const book = vocabularyBooks.find(b => b.id === bookId);
  const unit = book && book.units ? book.units.find(u => u.id === unitId) : null;

  // 初始化待学习的单词（排除已学完的）
  useEffect(() => {
    if (unit && unit.words && unit.words.length > 0 && allWords.length === 0) {
      const unitProgress = getUnitProgress(bookId, unitId, unit);
      const learnedWordIds = unitProgress.learnedWords || [];
      const unlearnedWords = unit.words.filter(word => !learnedWordIds.includes(word.id));

      if (unlearnedWords.length === 0) {
        setPhase('already_complete');
      } else {
        // 恢复上次的学习位置
        const savedPosition = getLearningPosition(bookId, unitId);

        setAllWords(unlearnedWords);

        if (savedPosition && savedPosition.batchIndex !== undefined) {
          // 有保存的位置，恢复
          const savedBatchIndex = savedPosition.batchIndex;
          const savedCurrentIndex = savedPosition.currentIndex;

          // 计算对应的批次
          const batchStart = savedBatchIndex * BATCH_SIZE;
          const batch = unlearnedWords.slice(batchStart, batchStart + BATCH_SIZE);

          if (batch.length > 0 && savedCurrentIndex < batch.length) {
            setBatchIndex(savedBatchIndex);
            setCurrentBatch(batch);
            setCurrentIndex(savedCurrentIndex);
          } else {
            // 位置无效，从开始学习
            setCurrentBatch(unlearnedWords.slice(0, BATCH_SIZE));
          }
        } else {
          // 没有保存的位置，从开始学习
          setCurrentBatch(unlearnedWords.slice(0, BATCH_SIZE));
        }
      }
    }
  }, [unit, bookId, unitId, getUnitProgress, allWords.length]);

  // 保存学习位置（学习阶段切换单词时）
  useEffect(() => {
    if (phase === 'learning' && currentBatch.length > 0) {
      saveLearningPosition(bookId, unitId, batchIndex, currentIndex);
    }
  }, [phase, batchIndex, currentIndex, currentBatch, bookId, unitId]);

  // 自动发音
  useEffect(() => {
    if (phase === 'learning' && currentBatch.length > 0 && currentBatch[currentIndex]) {
      const word = currentBatch[currentIndex];
      const timer = setTimeout(() => speakWord(word.english), 500);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, currentBatch, phase]);

  // 学完最后一个单词后自动进入测试
  useEffect(() => {
    if (phase === 'learning' && currentBatch.length > 0 && currentIndex === currentBatch.length - 1) {
      const timer = setTimeout(() => startTest(), 3000); // 增加延迟到3秒
      return () => clearTimeout(timer);
    }
  }, [currentIndex, currentBatch, phase]);

  const speakWord = async (text) => {
    if (isSpeaking) return;
    setIsSpeaking(true);
    try {
      await audioService.speakWord(text, 'en-US');
    } catch (e) {
      console.log('发音失败:', e);
    }
    setIsSpeaking(false);
  };

  const generateOptions = useCallback((currentWord) => {
    if (!allWords.length) return [];
    const otherWords = allWords.filter(w => w.id !== currentWord.id);
    const distractors = shuffle(otherWords).slice(0, 3);
    const allOptions = shuffle([currentWord, ...distractors]);
    return allOptions.map(w => ({
      chinese: w.chinese,
      isCorrect: w.id === currentWord.id,
      wordId: w.id
    }));
  }, [allWords]);

  const startTest = () => {
    setPhase('testing');
    setTestIndex(0);
    setTestResults([]);
    setWrongAttempts({});
    setShowDetail(false);
    setSelectedAnswer(null);
    setShowAnswerResult(false);
    if (currentBatch[0]) {
      setOptions(generateOptions(currentBatch[0]));
    }
  };

  const handleSelectAnswer = async (option) => {
    if (showAnswerResult) return;
    const currentWord = currentBatch[testIndex];

    if (option.isCorrect) {
      setSelectedAnswer(option);
      setShowAnswerResult(true);
      audioService.playCorrect();
      await speakWord(currentWord.english);

      const attempts = wrongAttempts[currentWord.id] || 0;
      setTestResults(prev => [...prev, { word: currentWord, correct: true, wrongAttempts: attempts }]);

      setTimeout(() => {
        if (testIndex < currentBatch.length - 1) {
          setTestIndex(testIndex + 1);
          setOptions(generateOptions(currentBatch[testIndex + 1]));
          setSelectedAnswer(null);
          setShowAnswerResult(false);
        } else {
          // 测试完成，进入连连看
          startMatching();
        }
      }, 1000);
    } else {
      audioService.playWrong();
      setSelectedAnswer(option);
      setWrongAttempts(prev => ({
        ...prev,
        [currentWord.id]: (prev[currentWord.id] || 0) + 1
      }));
    }
  };

  // 开始连连看
  const startMatching = () => {
    // 把当前批次的所有单词分成2轮
    const allBatchWords = shuffle([...currentBatch]);
    const firstRoundCount = Math.ceil(allBatchWords.length / 2); // 第一轮：一半（向上取整，如5个则3个）

    const firstRoundWords = allBatchWords.slice(0, firstRoundCount);
    const secondRoundWords = allBatchWords.slice(firstRoundCount);

    // 设置本轮单词和剩余单词
    setMatchingWords(firstRoundWords);
    setRemainingWords(secondRoundWords);
    setMatchingRound(1);

    // 获取干扰项（从其他单词的释义中选取）
    const otherWords = allWords.filter(w => !firstRoundWords.find(s => s.id === w.id));
    const distractorCount = Math.max(1, Math.floor(firstRoundWords.length / 2)); // 干扰项数量
    const distractors = shuffle(otherWords).slice(0, distractorCount);

    // 合并正确释义和干扰项，然后打乱
    const allMeanings = shuffle([
      ...firstRoundWords.map(w => ({ chinese: w.chinese, wordId: w.id, isCorrect: true })),
      ...distractors.map(w => ({ chinese: w.chinese, wordId: w.id, isCorrect: false }))
    ]);
    setMatchingOptions(allMeanings);

    // 重置状态
    setMatchedPairs([]);
    setSelectedWord(null);
    setSelectedMeaning(null);
    setMatchingWrongAttempts(0);
    setMatchingRoundComplete(false);
    setPhase('matching');
  };

  // 选择英文单词
  const handleSelectWord = (word) => {
    if (matchedPairs.find(p => p.wordId === word.id)) return; // 已匹配
    setSelectedWord(word);
    speakWord(word.english);

    // 如果已选择释义，检查匹配
    if (selectedMeaning) {
      checkMatch(word, selectedMeaning);
    }
  };

  // 选择中文释义
  const handleSelectMeaning = (meaning) => {
    if (matchedPairs.find(p => p.chinese === meaning.chinese)) return; // 已匹配
    setSelectedMeaning(meaning);

    // 如果已选择单词，检查匹配
    if (selectedWord) {
      checkMatch(selectedWord, meaning);
    }
  };

  // 检查匹配
  const checkMatch = (word, meaning) => {
    if (meaning.wordId === word.id && meaning.isCorrect) {
      // 匹配正确
      audioService.playCorrect();
      setMatchedPairs(prev => [...prev, { wordId: word.id, english: word.english, chinese: meaning.chinese }]);
      setSelectedWord(null);
      setSelectedMeaning(null);

      // 检查本轮是否完成
      if (matchedPairs.length + 1 === matchingWords.length) {
        // 本轮完成，显示等待点击状态
        setMatchingRoundComplete(true);

        // 如果是最后一轮，播放表扬声音
        if (matchingRound === 2 || remainingWords.length === 0) {
          audioService.speakPraise('易小城');
        }
      }
    } else {
      // 匹配错误
      audioService.playWrong();
      setMatchingWrongAttempts(prev => prev + 1);
      setSelectedWord(null);
      setSelectedMeaning(null);
    }
  };

  // 连连看本轮完成后，点击"下一个"按钮
  const handleMatchingNext = () => {
    if (matchingRound === 1 && remainingWords.length > 0) {
      // 进入第二轮连连看
      setMatchingRound(2);
      setMatchingWords(remainingWords);

      // 获取干扰项
      const otherWords = allWords.filter(w => !remainingWords.find(s => s.id === w.id));
      const distractorCount = Math.max(1, Math.floor(remainingWords.length / 2));
      const distractors = shuffle(otherWords).slice(0, distractorCount);

      const allMeanings = shuffle([
        ...remainingWords.map(w => ({ chinese: w.chinese, wordId: w.id, isCorrect: true })),
        ...distractors.map(w => ({ chinese: w.chinese, wordId: w.id, isCorrect: false }))
      ]);
      setMatchingOptions(allMeanings);

      // 重置状态
      setMatchedPairs([]);
      setSelectedWord(null);
      setSelectedMeaning(null);
      setRemainingWords([]);
      setMatchingRoundComplete(false);
    } else {
      // 全部完成，进入下一组学习
      // 保存进度
      testResults.forEach(result => {
        updateProgress(bookId, unitId, result.word.id);
        if (result.wrongAttempts > 0) {
          addWrongWord(bookId, result.word);
        }
      });
      setAllResults(prev => [...prev, ...testResults]);

      // 进入下一批或完成
      const nextBatchStart = (batchIndex + 1) * BATCH_SIZE;
      const nextBatch = allWords.slice(nextBatchStart, nextBatchStart + BATCH_SIZE);

      if (nextBatch.length > 0) {
        setBatchIndex(batchIndex + 1);
        setCurrentBatch(nextBatch);
        setCurrentIndex(0);
        setPhase('learning');
        setShowDetail(false);
        setTestResults([]);
        setMatchingRound(1);
        setRemainingWords([]);
        setMatchingRoundComplete(false);
      } else {
        setPhase('complete');
      }
    }
  };

  const finishBatch = () => {
    setAllResults(prev => [...prev, ...testResults]);
    testResults.forEach(result => {
      updateProgress(bookId, unitId, result.word.id);
      if (result.wrongAttempts > 0) {
        addWrongWord(bookId, result.word);
      }
    });

    const nextBatchStart = (batchIndex + 1) * BATCH_SIZE;
    const nextBatch = allWords.slice(nextBatchStart, nextBatchStart + BATCH_SIZE);

    if (nextBatch.length > 0) {
      setPhase('batch_result');
    } else {
      setPhase('complete');
    }
  };

  const nextBatch = () => {
    const nextBatchStart = (batchIndex + 1) * BATCH_SIZE;
    const nextBatchWords = allWords.slice(nextBatchStart, nextBatchStart + BATCH_SIZE);
    setBatchIndex(batchIndex + 1);
    setCurrentBatch(nextBatchWords);
    setCurrentIndex(0);
    setPhase('learning');
    setShowDetail(false);
    setTestResults([]);
  };

  const handleBack = () => navigate(`/book/${bookId}`);
  const handleNext = () => {
    if (currentIndex < currentBatch.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowDetail(false);
    }
  };
  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setShowDetail(false);
    }
  };
  const toggleDetail = () => {
    setShowDetail(!showDetail);
    const word = currentBatch[currentIndex];
    if (!showDetail && word?.example) {
      setTimeout(() => speakWord(word.example), 1000);
    }
  };

  // 错误页面
  if (!book || !unit) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 p-4 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-sm">
          <h2 className="text-xl font-bold text-gray-800 mb-2">找不到该单词本或单元</h2>
          <p className="text-gray-500 mb-4">bookId: {bookId}, unitId: {unitId}</p>
          <button onClick={() => navigate('/')} className="bg-blue-500 text-white px-6 py-2 rounded-full active:scale-98 transition-transform">
            返回首页
          </button>
        </div>
      </div>
    );
  }

  // 加载状态
  if (currentBatch.length === 0 && phase !== 'already_complete') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 p-4 flex items-center justify-center">
        <p className="text-white">正在加载...</p>
      </div>
    );
  }

  const totalWords = allWords.length;

  // ===== 已全部学完 =====
  if (phase === 'already_complete') {
    const unitProgress = getUnitProgress(bookId, unitId, unit);
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 p-4 pb-8">
        <div className="flex justify-between items-center mb-4">
          <button onClick={handleBack} className="bg-white/20 text-white px-4 py-2 rounded-full active:scale-98 transition-transform">
            ← 返回
          </button>
          <span className="text-white font-bold">{unit?.name} - 已完成</span>
          <span></span>
        </div>
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-sm mx-auto">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">本单元已全部学完！</h2>
          <p className="text-gray-600 mb-2">共 {unit?.words?.length || 0} 个单词</p>
          <p className="text-sm text-gray-500">进度：{unitProgress.learned} / {unitProgress.total} ({unitProgress.percentage}%)</p>
        </div>
        <div className="flex justify-center mt-6">
          <button onClick={handleBack} className="bg-green-500 text-white px-8 py-3 rounded-full active:scale-98 transition-transform font-medium">
            返回单元
          </button>
        </div>
      </div>
    );
  }

  // ===== 全部完成 =====
  if (phase === 'complete') {
    const finalResults = [...allResults, ...testResults];
    const correctCount = finalResults.filter(r => r.correct).length;
    const wrongWords = finalResults.filter(r => r.wrongAttempts > 0).map(r => r.word);

    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-400 via-orange-400 to-pink-400 p-4 pb-8">
        <div className="flex justify-between items-center mb-4">
          <button onClick={handleBack} className="bg-white/20 text-white px-4 py-2 rounded-full active:scale-98 transition-transform">
            ← 返回
          </button>
          <span className="text-white font-bold">🎉 学习完成</span>
          <span></span>
        </div>
        <div className="card-kid rounded-2xl p-8 text-center max-w-sm mx-auto">
          <div className="text-5xl mb-4 animate-bounce-soft">🏆</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">太棒了！单元完成！</h2>
          <p className="text-gray-600 mb-2">共学习 {totalWords} 个单词</p>
          <p className="text-lg mb-4">
            正确 <span className="text-green-600 font-bold">{correctCount}</span> 题 ✨
          </p>
          {wrongWords.length > 0 && (
            <div className="mt-4">
              <h3 className="text-orange-600 font-bold mb-2">📝 需要复习 ({wrongWords.length})</h3>
              <div className="space-y-2">
                {wrongWords.map(word => (
                  <div key={word.id} className="bg-orange-50 rounded-xl p-3 flex justify-between items-center border border-orange-200">
                    <span className="font-bold text-gray-800">{word.english}</span>
                    <span className="text-gray-500">{word.chinese}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-center gap-4 mt-6">
          <button onClick={() => { setBatchIndex(0); setCurrentBatch(allWords.slice(0, BATCH_SIZE)); setCurrentIndex(0); setPhase('learning'); setAllResults([]); }} className="bg-white/30 text-white px-6 py-3 rounded-full active:scale-98 transition-transform">
            🔄 重新学习
          </button>
          <button onClick={handleBack} className="btn-kid text-white px-6 py-3 rounded-full">
            ✅ 返回单元
          </button>
        </div>
      </div>
    );
  }

  // ===== 批次结果 =====
  if (phase === 'batch_result') {
    const correctCount = testResults.filter(r => r.correct).length;
    const completedCount = batchIndex * BATCH_SIZE + currentBatch.length;

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 p-4 pb-8">
        <div className="flex justify-between items-center mb-4">
          <button onClick={handleBack} className="bg-white/20 text-white px-4 py-2 rounded-full active:scale-98 transition-transform">
            ← 返回
          </button>
          <span className="text-white font-bold">测试结果</span>
          <span className="text-white">{completedCount} / {totalWords}</span>
        </div>
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-sm mx-auto">
          <div className="text-4xl mb-4">{correctCount >= currentBatch.length * 0.8 ? '🎉' : '💪'}</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">继续加油！</h2>
          <p className="text-lg text-gray-600">
            正确 <span className="text-green-500 font-bold">{correctCount}</span> 题
          </p>
        </div>
        <div className="flex justify-center mt-6">
          <button onClick={nextBatch} className="bg-amber-500 text-white px-8 py-3 rounded-full active:scale-98 transition-transform font-medium">
            继续
          </button>
        </div>
      </div>
    );
  }

  // ===== 连连看阶段 =====
  if (phase === 'matching') {
    const completedCount = batchIndex * BATCH_SIZE + currentBatch.length;
    const totalMatching = currentBatch.length;

    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-400 via-cyan-400 to-blue-400 p-4 pb-8">
        <div className="flex justify-between items-center mb-4">
          <button onClick={handleBack} className="bg-white/20 text-white px-4 py-2 rounded-full active:scale-98 transition-transform">
            ← 返回
          </button>
          <span className="text-white font-bold">🎯 连连看</span>
          <span></span>
        </div>

        <div className="card-kid rounded-2xl p-6 max-w-md mx-auto">
          {/* 英文单词列 */}
          <div className="mb-6">
            <div className="text-sm text-teal-600 mb-2 text-center font-medium">📝 点击单词</div>
            <div className="flex flex-wrap justify-center gap-3">
              {matchingWords.map(word => {
                const isMatched = matchedPairs.find(p => p.wordId === word.id);
                const isSelected = selectedWord?.id === word.id;
                return (
                  <button
                    key={word.id}
                    onClick={() => handleSelectWord(word)}
                    disabled={isMatched || matchingRoundComplete}
                    className={`px-4 py-3 rounded-xl text-lg font-bold transition-all ${
                      isMatched
                        ? 'bg-teal-100 text-teal-600 border-2 border-teal-400'
                        : isSelected
                          ? 'bg-cyan-200 text-cyan-800 border-3 border-cyan-500 scale-110 shadow-lg'
                          : 'bg-teal-50 text-gray-700 hover:bg-teal-100 active:scale-98 border-2 border-teal-200'
                    } ${isMatched ? 'cursor-default' : 'cursor-pointer'}`}
                  >
                    {word.english}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 中文释义列 */}
          <div>
            <div className="text-sm text-blue-600 mb-2 text-center font-medium">📖 点击释义</div>
            <div className="flex flex-wrap justify-center gap-3">
              {matchingOptions.map((meaning, index) => {
                const isMatched = matchedPairs.find(p => p.chinese === meaning.chinese);
                const isSelected = selectedMeaning?.chinese === meaning.chinese;
                return (
                  <button
                    key={index}
                    onClick={() => handleSelectMeaning(meaning)}
                    disabled={isMatched || matchingRoundComplete}
                    className={`px-4 py-3 rounded-xl text-lg transition-all ${
                      isMatched
                        ? 'bg-blue-100 text-blue-600 border-2 border-blue-400'
                        : isSelected
                          ? 'bg-indigo-200 text-indigo-800 border-3 border-indigo-500 scale-110 shadow-lg'
                          : 'bg-blue-50 text-gray-700 hover:bg-blue-100 active:scale-98 border-2 border-blue-200'
                    } ${isMatched ? 'cursor-default' : 'cursor-pointer'}`}
                  >
                    {meaning.chinese}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 提示或下一个按钮 */}
          {matchingRoundComplete ? (
            <div className="mt-6 flex justify-center">
              <button
                onClick={handleMatchingNext}
                className="btn-kid px-8 py-3 rounded-full text-white font-medium"
              >
                下一个 ➡️
              </button>
            </div>
          ) : (
            <div className="text-center text-gray-500 mt-4 text-sm">
              将单词与正确释义连线
            </div>
          )}
        </div>
      </div>
    );
  }

  // ===== 测试阶段 =====
  if (phase === 'testing') {
    const currentWord = currentBatch[testIndex];
    const completedCount = batchIndex * BATCH_SIZE + testIndex;

    // 测试进度星星
    const renderTestProgress = () => {
      const stars = [];
      for (let i = 0; i < currentBatch.length; i++) {
        const isCompleted = i < testIndex;
        const isCurrent = i === testIndex;
        stars.push(
          <span key={i} className={`text-lg transition-all ${isCompleted ? 'text-yellow-400' : 'text-gray-300'} ${isCurrent ? 'animate-float' : ''}`}>
            {isCompleted ? '⭐' : '○'}
          </span>
        );
      }
      return stars;
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-400 via-emerald-400 to-teal-400 p-4 pb-8">
        <div className="flex justify-between items-center mb-4">
          <button onClick={handleBack} className="bg-white/20 text-white px-4 py-2 rounded-full active:scale-98 transition-transform">
            ← 返回
          </button>
          <span className="text-white font-bold">📝 测试</span>
          <span className="text-white">{completedCount + 1} / {totalWords}</span>
        </div>

        {/* 进度指示 */}
        <div className="flex justify-center gap-1 mb-4">
          {renderTestProgress()}
        </div>

        <div className="card-kid rounded-2xl p-6 max-w-sm mx-auto">
          {/* 单词显示 */}
          <div
            onClick={() => speakWord(currentWord.english)}
            className="text-center cursor-pointer active:scale-98 transition-transform mb-6"
          >
            <div className="text-3xl font-bold text-gray-800">
              {currentWord.english}
              <span className="ml-2 text-xl opacity-60">🔊</span>
            </div>
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
            <p className="text-center text-orange-600 mt-4 font-medium">💪 再试一次！</p>
          )}
        </div>
      </div>
    );
  }

  // ===== 学习阶段 =====
  const word = currentBatch[currentIndex];
  const completedWords = batchIndex * BATCH_SIZE + currentIndex + 1;

  // 进度星星
  const renderProgressStars = () => {
    const stars = [];
    for (let i = 0; i < currentBatch.length; i++) {
      const isCompleted = i <= currentIndex;
      stars.push(
        <span key={i} className={`text-xl transition-all ${isCompleted ? 'text-yellow-400' : 'text-gray-300'} ${i === currentIndex ? 'animate-float' : ''}`}>
          ⭐
        </span>
      );
    }
    return stars;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-400 via-purple-400 to-pink-400 p-4 flex flex-col">
      {/* 顶部导航 */}
      <div className="flex justify-between items-center mb-2">
        <button onClick={handleBack} className="bg-white/20 text-white px-4 py-2 rounded-full active:scale-98 transition-transform flex items-center gap-1">
          <span>←</span>
          <span>返回</span>
        </button>
        <span className="text-white font-bold text-lg">{unit.name}</span>
        <span className="text-white font-medium">{completedWords} / {totalWords}</span>
      </div>

      {/* 进度星星 */}
      <div className="flex justify-center gap-2 mb-4">
        {renderProgressStars()}
      </div>

      {/* 单词卡片 - 居中 */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="card-kid rounded-2xl p-8 w-full max-w-sm">
          <div onClick={() => speakWord(word.english)} className="text-center cursor-pointer active:scale-98 transition-transform">
            <div className="text-4xl font-bold text-gray-800 mb-3">
              {word.english}
              <span className="ml-2 text-xl opacity-60">🔊</span>
            </div>
            {word.phonetic && <div className="text-base text-gray-500 mb-1">{word.phonetic}</div>}
            {word.partOfSpeech && <div className="text-base text-purple-500 italic mb-3">{word.partOfSpeech}</div>}
            <div className="text-2xl text-gray-700 font-medium">{word.chinese}</div>
          </div>

          {/* 例句 */}
          {word.example && (
            <button onClick={toggleDetail} className={`w-full mt-6 p-3 rounded-xl transition-all ${showDetail ? 'bg-purple-500 text-white shadow-md' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'}`}>
              {showDetail ? '✨ 隐藏例句' : '📖 查看例句'}
            </button>
          )}
          {showDetail && word.example && (
            <div className="mt-4 p-4 bg-purple-50 rounded-xl border-2 border-purple-200">
              <div className="text-gray-700">{word.example}</div>
              <div onClick={() => speakWord(word.example)} className="text-sm text-purple-500 mt-2 cursor-pointer flex items-center justify-center gap-1">
              🔊 点击朗读例句
            </div>
          </div>
        )}
      </div>

      {/* 导航按钮 */}
      <div className="flex justify-center gap-4 mt-6">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className={`px-8 py-3 rounded-full transition-all font-medium ${
            currentIndex === 0
              ? 'bg-white/10 text-white/40 cursor-not-allowed'
              : 'bg-white/30 text-white hover:bg-white/40 active:scale-98 cursor-pointer'
          }`}
        >
          上一个
        </button>
        <button
          onClick={handleNext}
          disabled={currentIndex === currentBatch.length - 1}
          className={`btn-kid px-8 py-3 rounded-full font-medium text-white ${
            currentIndex === currentBatch.length - 1
              ? 'opacity-50 cursor-not-allowed'
              : 'cursor-pointer'
          }`}
        >
          下一个
        </button>
      </div>

      {/* 提示 */}
      {currentIndex === currentBatch.length - 1 && (
        <div className="text-center text-white/90 text-sm mt-4 animate-pulse">
          ✨ 学完即将进入测试...
        </div>
      )}

      {/* 重读按钮 */}
      <div className="flex justify-center mt-4 mb-4">
        <button onClick={() => speakWord(word.english)} className="bg-white/20 text-white px-6 py-2 rounded-full active:scale-98 transition-transform flex items-center gap-1">
          🔊 重新朗读
        </button>
      </div>
      </div>
    </div>
  );
}

export default LearnPage;