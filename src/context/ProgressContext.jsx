import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { useAuth } from './AuthContext';

const ProgressContext = createContext(null);

// 获取今天的日期字符串 (YYYY-MM-DD)
const getTodayKey = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};

export function ProgressProvider({ children }) {
  const { user } = useAuth();

  // 本地状态（作为缓存）
  const [progress, setProgress] = useState(() => {
    const saved = localStorage.getItem('vocabulary-progress');
    return saved ? JSON.parse(saved) : {};
  });

  const [wrongWords, setWrongWords] = useState(() => {
    const saved = localStorage.getItem('vocabulary-wrong-words');
    return saved ? JSON.parse(saved) : {};
  });

  const [learningCalendar, setLearningCalendar] = useState(() => {
    const saved = localStorage.getItem('vocabulary-learning-calendar');
    return saved ? JSON.parse(saved) : {};
  });

  // 用户登录后，从云端加载数据
  useEffect(() => {
    if (user) {
      loadFromCloud();
    }
  }, [user]);

  // 从云端加载所有数据
  const loadFromCloud = async () => {
    if (!user) return;

    try {
      // 加载学习进度
      const { data: progressData } = await supabase
        .from('learning_progress')
        .select('*')
        .eq('user_id', user.id);

      if (progressData) {
        const progressMap = {};
        progressData.forEach(item => {
          if (!progressMap[item.book_id]) {
            progressMap[item.book_id] = { units: {} };
          }
          if (!progressMap[item.book_id].units[item.unit_id]) {
            progressMap[item.book_id].units[item.unit_id] = { learnedWords: [] };
          }
          if (!progressMap[item.book_id].units[item.unit_id].learnedWords.includes(item.word_id)) {
            progressMap[item.book_id].units[item.unit_id].learnedWords.push(item.word_id);
          }
        });
        setProgress(progressMap);
        localStorage.setItem('vocabulary-progress', JSON.stringify(progressMap));
      }

      // 加载错词
      const { data: wrongData } = await supabase
        .from('wrong_words')
        .select('*')
        .eq('user_id', user.id);

      if (wrongData) {
        const wrongMap = {};
        wrongData.forEach(item => {
          if (!wrongMap[item.book_id]) {
            wrongMap[item.book_id] = [];
          }
          wrongMap[item.book_id].push(item.word_data);
        });
        setWrongWords(wrongMap);
        localStorage.setItem('vocabulary-wrong-words', JSON.stringify(wrongMap));
      }

      // 加载学习日历
      const { data: calendarData } = await supabase
        .from('learning_calendar')
        .select('*')
        .eq('user_id', user.id);

      if (calendarData) {
        const calendarMap = {};
        calendarData.forEach(item => {
          calendarMap[item.date] = item.word_count;
        });
        setLearningCalendar(calendarMap);
        localStorage.setItem('vocabulary-learning-calendar', JSON.stringify(calendarMap));
      }
    } catch (e) {
      console.log('从云端加载失败:', e);
    }
  };

  // 更新单词学习进度
  const updateProgress = async (bookId, unitId, wordId) => {
    // 更新本地状态
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
      localStorage.setItem('vocabulary-progress', JSON.stringify(newProgress));
      return newProgress;
    });

    // 同步到云端
    if (user) {
      try {
        await supabase.from('learning_progress').upsert({
          user_id: user.id,
          book_id: bookId,
          unit_id: unitId,
          word_id: wordId,
          learned_at: new Date().toISOString()
        }, { onConflict: 'user_id,book_id,unit_id,word_id' });
      } catch (e) {
        console.log('同步进度失败:', e);
      }
    }

    // 更新学习日历
    const todayKey = getTodayKey();
    setLearningCalendar(prev => {
      const newCalendar = { ...prev };
      if (!newCalendar[todayKey]) {
        newCalendar[todayKey] = 0;
      }
      newCalendar[todayKey] += 1;
      localStorage.setItem('vocabulary-learning-calendar', JSON.stringify(newCalendar));
      return newCalendar;
    });

    // 同步日历到云端
    if (user) {
      try {
        const currentCount = learningCalendar[todayKey] || 0;
        await supabase.from('learning_calendar').upsert({
          user_id: user.id,
          date: todayKey,
          word_count: currentCount + 1
        }, { onConflict: 'user_id,date' });
      } catch (e) {
        console.log('同步日历失败:', e);
      }
    }
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
  const addWrongWord = async (bookId, word) => {
    setWrongWords(prev => {
      const newWrongWords = { ...prev };
      if (!newWrongWords[bookId]) {
        newWrongWords[bookId] = [];
      }
      if (!newWrongWords[bookId].find(w => w.id === word.id)) {
        newWrongWords[bookId] = [...newWrongWords[bookId], word];
      }
      localStorage.setItem('vocabulary-wrong-words', JSON.stringify(newWrongWords));
      return newWrongWords;
    });

    // 同步到云端
    if (user) {
      try {
        await supabase.from('wrong_words').upsert({
          user_id: user.id,
          book_id: bookId,
          word_id: word.id,
          word_data: word
        }, { onConflict: 'user_id,book_id,word_id' });
      } catch (e) {
        console.log('同步错词失败:', e);
      }
    }
  };

  // 获取单词本的错词
  const getWrongWords = (bookId) => {
    return wrongWords[bookId] || [];
  };

  // 重置进度
  const resetProgress = async (bookId) => {
    setProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[bookId];
      localStorage.setItem('vocabulary-progress', JSON.stringify(newProgress));
      return newProgress;
    });

    // 从云端删除
    if (user) {
      try {
        await supabase.from('learning_progress').delete()
          .eq('user_id', user.id)
          .eq('book_id', bookId);
      } catch (e) {
        console.log('删除云端进度失败:', e);
      }
    }
  };

  return (
    <ProgressContext.Provider value={{
      progress,
      updateProgress,
      getBookProgress,
      getUnitProgress,
      addWrongWord,
      getWrongWords,
      resetProgress,
      getMonthCalendar,
      loadFromCloud
    }}>
      {children}
    </ProgressContext.Provider>
  );
}

export function useProgress() {
  const context = useContext(ProgressContext);
  if (!context) {
    throw new Error('useProgress must be used within ProgressProvider');
  }
  return context;
}

export default ProgressContext;