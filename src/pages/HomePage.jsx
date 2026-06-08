import { useNavigate } from 'react-router-dom';
import { useProgress } from '../context/ProgressContext';
import { vocabularyBooks } from '../data/vocabularyBooks';
import { useState } from 'react';

// 学习日历组件
function LearningCalendar() {
  const { getMonthCalendar } = useProgress();
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthData = getMonthCalendar(year, month);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0是周日

  const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  const goToPrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // 生成日历格子
  const calendarDays = [];
  const today = new Date();
  const todayDay = today.getDate();
  const todayMonth = today.getMonth();
  const todayYear = today.getFullYear();

  // 填充空白格子（月初前）
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(<div key={`empty-${i}`} className="w-8 h-8"></div>);
  }

  // 填充日期格子
  for (let day = 1; day <= daysInMonth; day++) {
    const wordCount = monthData[day];
    const isToday = day === todayDay && month === todayMonth && year === todayYear;

    calendarDays.push(
      <div
        key={day}
        className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs relative ${
          wordCount
            ? 'bg-green-400 text-white font-bold shadow-sm'
            : isToday
              ? 'bg-blue-100 text-blue-600 font-bold'
              : 'bg-gray-100 text-gray-500'
        }`}
      >
        {day}
        {wordCount && (
          <span className="absolute -top-1 -right-1 bg-green-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center leading-none">
            {wordCount > 9 ? '9+' : wordCount}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-4 mb-4">
      {/* 月份导航 */}
      <div className="flex justify-between items-center mb-3">
        <button onClick={goToPrevMonth} className="text-gray-500 hover:text-gray-700 px-2 py-1">
          ‹
        </button>
        <div className="flex items-center gap-2">
          <span className="font-bold text-gray-800">{year}年 {monthNames[month]}</span>
          <button onClick={goToToday} className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">
            今天
          </button>
        </div>
        <button onClick={goToNextMonth} className="text-gray-500 hover:text-gray-700 px-2 py-1">
          ›
        </button>
      </div>

      {/* 星期标题 */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map(day => (
          <div key={day} className="w-8 h-6 text-center text-xs text-gray-400">
            {day}
          </div>
        ))}
      </div>

      {/* 日历格子 */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays}
      </div>
    </div>
  );
}

function HomePage() {
  const navigate = useNavigate();
  const { getBookProgress, getWrongWords } = useProgress();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 p-4 pb-20">
      {/* 头部 */}
      <div className="text-center py-6">
        <h1 className="text-3xl font-bold text-white drop-shadow-lg">
          📚 背单词乐园
        </h1>
        <p className="text-white/90 mt-2">选择你想学习的单词本</p>
      </div>

      {/* 学习日历 */}
      <LearningCalendar />

      {/* 单词本卡片列表 */}
      <div className="space-y-4">
        {vocabularyBooks.map(book => {
          const progress = getBookProgress(book.id, book);
          const wrongWordsCount = getWrongWords(book.id).length;

          return (
            <div
              key={book.id}
              onClick={() => navigate(`/book/${book.id}`)}
              className="bg-white rounded-2xl shadow-lg p-5 active:scale-98 transition-transform cursor-pointer"
            >
              <div className="flex items-center gap-4">
                {/* 图标 */}
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                  style={{ backgroundColor: book.color + '20' }}
                >
                  {book.icon}
                </div>

                {/* 信息 */}
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-800">{book.name}</h3>
                  <p className="text-gray-500 text-sm">{book.description}</p>

                  {/* 进度条 */}
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>已学习 {progress.learned}/{progress.total} 个单词</span>
                      <span>{progress.percentage}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${progress.percentage}%`,
                          backgroundColor: book.color
                        }}
                      />
                    </div>
                  </div>

                  {/* 错词提示 */}
                  {wrongWordsCount > 0 && (
                    <div className="mt-2 inline-flex items-center gap-1 bg-red-100 text-red-600 px-2 py-1 rounded-full text-xs">
                      <span>❌</span>
                      <span>{wrongWordsCount} 个错词需要复习</span>
                    </div>
                  )}
                </div>

                {/* 箭头 */}
                <div className="text-gray-300 text-2xl">›</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 底部说明 */}
      <div className="mt-8 text-center text-white/70 text-sm">
        <p>💡 点击单词本开始学习</p>
        <p className="mt-1">将本网站添加到主屏幕，像APP一样使用</p>
      </div>
    </div>
  );
}

export default HomePage;