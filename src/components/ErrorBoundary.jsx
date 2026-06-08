import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error: error.message };
  }

  componentDidCatch(error, errorInfo) {
    console.log('Error caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-red-400 to-orange-500 p-4 flex flex-col items-center justify-center">
          <div className="bg-white rounded-3xl shadow-2xl p-8 text-center">
            <h2 className="text-4xl mb-4">⚠️</h2>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">出错了</h3>
            <p className="text-gray-600 mb-4">{this.state.error || '未知错误'}</p>
            <button
              onClick={() => window.location.reload()}
              className="py-4 px-6 bg-blue-500 text-white rounded-2xl text-xl font-bold active:scale-95 transition-transform"
            >
              刷新页面
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;