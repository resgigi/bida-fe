import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    // Keep minimal logging for production troubleshooting.
    console.error('Unhandled UI error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl border border-red-100 bg-white p-6 text-center">
            <h2 className="text-lg font-semibold text-gray-800">Đã xảy ra lỗi giao diện</h2>
            <p className="mt-2 text-sm text-gray-500">
              Vui lòng tải lại trang. Nếu lỗi vẫn còn, hãy liên hệ quản trị viên.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Tải lại trang
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
