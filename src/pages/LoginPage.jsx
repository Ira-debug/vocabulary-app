import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function LoginPage() {
  const navigate = useNavigate();
  const { signUp, signIn } = useAuth();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await signIn(email, password);
        navigate('/');
      } else {
        await signUp(email, password, username);
        navigate('/');
      }
    } catch (err) {
      setError(err.message || '操作失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 p-4 flex items-center justify-center safe-top">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full">
        {/* 标题 */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">
            📚 背单词乐园
          </h1>
          <p className="text-gray-500 mt-2">
            {isLogin ? '登录账号，同步学习进度' : '注册新账号'}
          </p>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="text-sm text-gray-600 mb-1 block">用户名</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-400 focus:outline-none"
                placeholder="你的名字"
                required={!isLogin}
              />
            </div>
          )}

          <div>
            <label className="text-sm text-gray-600 mb-1 block">邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-400 focus:outline-none"
              placeholder="your@email.com"
              required
            />
          </div>

          <div>
            <label className="text-sm text-gray-600 mb-1 block">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-400 focus:outline-none"
              placeholder="至少6位密码"
              required
              minLength={6}
            />
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}

          {/* 提交按钮 */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-purple-500 text-white rounded-xl font-bold text-lg active:scale-95 transition-transform disabled:opacity-50"
          >
            {loading ? '处理中...' : (isLogin ? '登录' : '注册')}
          </button>
        </form>

        {/* 切换登录/注册 */}
        <div className="text-center mt-4">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-purple-500 text-sm"
          >
            {isLogin ? '没有账号？点击注册' : '已有账号？点击登录'}
          </button>
        </div>

        {/* 跳过登录（本地模式） */}
        <div className="text-center mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={() => navigate('/')}
            className="text-gray-500 text-sm"
          >
            暂不登录，使用本地模式
          </button>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;