import { useNavigate } from 'react-router-dom';
import { useProgress } from '../context/ProgressContext';
import { vocabularyBooks } from '../data/vocabularyBooks';

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