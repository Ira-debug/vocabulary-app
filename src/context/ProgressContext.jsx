import { createContext, useContext, useState, useEffect } from 'react';

const ProgressContext = createContext(null);

// 获取今天的日期字符串 (YYYY-MM-DD)
const getTodayKey = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};

export function ProgressProvider({ children }) {
  const [progress, setProgress] = useState(() => {
    const saved = localStorage.getItem('vocabulary-progress');
    return saved ? JSON.parse(saved) : {};
  });

  const [wrongWords, setWrongWords] = useState(() => {
    const saved = localStorage.getItem('vocabulary-wrong-words');
    return saved ? JSON.parse(saved) : {};
  });

  // 学习日历数据
  const [learningCalendar, setLearningCalendar] = useState(() => {
    const saved = localStorage.getItem('vocabulary-learning-calendar');
    return saved ? JSON.parse(saved) : {};
  });

  // 保存进度到本地存储
  useEffect(() => {
    localStorage.setItem('vocabulary-progress', JSON.stringify(progress));
  }, [progress]);

  useEffect(() => {
    localStorage.setItem('vocabulary-wrong-words', JSON.stringify(wrongWords));
  }, [wrongWords]);

  useEffect(() => {
    localStorage.setItem('vocabulary-learning-calendar', JSON.stringify(learningCalendar));
  }, [learningCalendar]);

  // 更新单词学习进度
  const updateProgress = (bookId, unitId, wordId) => {
    setProgress(prev => {
      const newProgress = { ...prev };
      if (!newProgress[bookId]) {
        newProgress[bookId] = { units: {} };
      }
      if (!newProgress[bookId].units[unitId]) {
        newProgress[bookId].units[unitId] = { learnedWords: [] };
      }
      if (!newProgress[bookId].units[unitId].learnedWords.includes(wordId)) {
        newProgress[bookId].units[unitId].learnedWords = [
          ...newProgress[bookId].units[unitId].learnedWords,
          wordId
        ];
      }
      return newProgress;
    });

    // 更新学习日历
    const todayKey = getTodayKey();
    setLearningCalendar(prev => {
      const newCalendar = { ...prev };
      if (!newCalendar[todayKey]) {
        newCalendar[todayKey] = 0;
      }
      newCalendar[todayKey] += 1;
      return newCalendar;
    });
  };

  // 获取某月的学习日历数据
  const getMonthCalendar = (year, month) => {
    const monthData = {};
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (learningCalendar[key]) {
        monthData[day] = learningCalendar[key];
      }
    }

    return monthData;
  };

  // 获取单词本进度
  const getBookProgress = (bookId, book) => {
    // 先计算总单词数（无论是否有学习进度）
    let totalLearned = 0;
    let totalWords = 0;

    if (book && book.units) {
      book.units.forEach(unit => {
        totalWords += unit.words.length;
      });
    }

    const bookProgress = progress[bookId];
    if (!bookProgress) {
      return { learned: 0, total: totalWords, percentage: 0 };
    }

    book.units.forEach(unit => {
      if (bookProgress.units[unit.id]) {
        totalLearned += bookProgress.units[unit.id].learnedWords.length;
      }
    });

    return {
      learned: totalLearned,
      total: totalWords,
      percentage: totalWords > 0 ? Math.round((totalLearned / totalWords) * 100) : 0
    };
  };

  // 获取单元进度
  const getUnitProgress = (bookId, unitId, unit) => {
    // 如果 unit 不存在，返回默认值
    if (!unit) {
      return { learnedWords: [], learned: 0, total: 0, percentage: 0 };
    }

    const bookProgress = progress[bookId];
    if (!bookProgress || !bookProgress.units[unitId]) {
      return { learnedWords: [], learned: 0, total: unit.words.length, percentage: 0 };
    }

    const learnedWords = bookProgress.units[unitId].learnedWords || [];
    return {
      learnedWords,
      learned: learnedWords.length,
      total: unit.words.length,
      percentage: unit.words.length > 0 ? Math.round((learnedWords.length / unit.words.length) * 100) : 0
    };
  };

  // 添加错词
  const addWrongWord = (bookId, word) => {
    setWrongWords(prev => {
      const newWrongWords = { ...prev };
      if (!newWrongWords[bookId]) {
        newWrongWords[bookId] = [];
      }
      if (!newWrongWords[bookId].find(w => w.id === word.id)) {
        newWrongWords[bookId] = [...newWrongWords[bookId], word];
      }
      return newWrongWords;
    });
  };

  // 移除错词
  const removeWrongWord = (bookId, wordId) => {
    setWrongWords(prev => {
      const newWrongWords = { ...prev };
      if (newWrongWords[bookId]) {
        newWrongWords[bookId] = newWrongWords[bookId].filter(w => w.id !== wordId);
      }
      return newWrongWords;
    });
  };

  // 获取单词本的错词
  const getWrongWords = (bookId) => {
    return wrongWords[bookId] || [];
  };

  // 重置进度
  const resetProgress = (bookId) => {
    setProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[bookId];
      return newProgress;
    });
  };

  return (
    <ProgressContext.Provider value={{
      progress,
      updateProgress,
      getBookProgress,
      getUnitProgress,
      addWrongWord,
      removeWrongWord,
      getWrongWords,
      resetProgress,
      getMonthCalendar
    }}>
      {children}
    </ProgressContext.Provider>
  );
}

export function useProgress() {
  const context = useContext(ProgressContext);
  if (!context) {
    throw new Error('useProgress must be used within a ProgressProvider');
  }
  return context;
}

export default ProgressContext;