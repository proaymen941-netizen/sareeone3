import React from 'react';

interface State {
  hasError: boolean;
  error: Error | null;
}

interface Props {
  children: React.ReactNode;
}

export class AdminErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('AdminErrorBoundary caught:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-8" dir="rtl">
          <div className="max-w-md w-full bg-white border border-red-200 rounded-2xl shadow-lg p-6 text-center">
            <div className="text-red-600 text-4xl mb-3">⚠️</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">حدث خطأ غير متوقع</h2>
            <p className="text-sm text-gray-600 mb-4">
              {this.state.error?.message || 'تعذّر عرض هذا القسم. يمكنك المحاولة مرة أخرى.'}
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium"
              >
                إعادة المحاولة
              </button>
              <button
                onClick={this.handleReload}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium"
              >
                تحديث الصفحة
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default AdminErrorBoundary;
