import { useParams, useNavigate } from 'react-router-dom';
import { useProgress } from '../context/ProgressContext';
import { vocabularyBooks } from '../data/vocabularyBooks';

function UnitListPage() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const { getUnitProgress, getWrongWords } = useProgress();

  const book = vocabularyBooks.find(b => b.id === bookId);
  if (!book) {
    return <div>单词本不存在</div>;
  }

  const wrongWords = getWrongWords(bookId);
  const wrongWordsCount = wrongWords.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 p-4 pb-20">
      {/* 头部 */}
      <div className="flex items-center gap-3 py-4">
        <button
          onClick={() => navigate('/')}
          className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white"
        >
          ←
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">{book.icon} {book.name}</h1>
          <p className="text-white/80 text-sm">{book.description}</p>
        </div>
      </div>

      {/* 错词练习入口 */}
      {wrongWordsCount > 0 && (
        <div
          onClick={() => navigate(`/wrong-words/${bookId}`)}
          className="bg-red-500 rounded-2xl shadow-lg p-4 mb-4 active:scale-98 transition-transform cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">❌</span>
              <div>
                <h3 className="text-xl font-bold text-white">错词本</h3>
                <p className="text-white/80 text-sm">{wrongWordsCount} 个单词需要复习</p>
              </div>
            </div>
            <div className="text-white text-2xl">›</div>
          </div>
        </div>
      )}

      {/* 单元列表 */}
      <div className="space-y-3">
        {book.units.map((unit, index) => {
          const progress = getUnitProgress(bookId, unit.id, unit);

          return (
            <div
              key={unit.id}
              onClick={() => navigate(`/learn/${bookId}/${unit.id}`)}
              className="bg-white rounded-2xl shadow-lg p-4 active:scale-98 transition-transform cursor-pointer"
            >
              <div className="flex items-center gap-4">
                {/* 序号 */}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                  style={{ backgroundColor: book.color }}
                >
                  {index + 1}
                </div>

                {/* 信息 */}
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-800">{unit.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span>{unit.words.length} 个单词</span>
                    {progress.percentage === 100 && (
                      <span className="text-green-500">✓ 已完成</span>
                    )}
                  </div>

                  {/* 进度条 */}
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>{progress.learned}/{progress.total}</span>
                      <span>{progress.percentage}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${progress.percentage}%`,
                          backgroundColor: progress.percentage === 100 ? '#10b981' : book.color
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* 开始按钮 */}
                <div
                  className="px-4 py-2 rounded-full text-white font-medium text-sm"
                  style={{ backgroundColor: book.color }}
                >
                  {progress.percentage === 100 ? '复习' : '学习'}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default UnitListPage;