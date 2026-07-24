import React, { useState, useEffect } from 'react';
import { Wallet, Plus, Minus, CreditCard, History, Search, DollarSign } from 'lucide-react';

interface WalletInfo {
  id: string;
  customerPhone: string;
  balance: string;
  loyaltyPoints: number;
  isActive: boolean;
  createdAt: string;
}

interface WalletTransaction {
  id: string;
  type: 'credit' | 'debit' | 'loyalty';
  amount: string;
  description: string;
  orderId?: string;
  createdAt: string;
}

interface Customer {
  phone: string;
  name: string;
  address: string;
}

export default function WalletManagement() {
  const [wallets, setWallets] = useState<WalletInfo[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<string>('');
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchPhone, setSearchPhone] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [transactionForm, setTransactionForm] = useState({
    type: 'credit' as 'credit' | 'debit',
    amount: '',
    description: ''
  });

  useEffect(() => {
    fetchCustomers();
    fetchWallets();
  }, []);

  useEffect(() => {
    if (selectedWallet) {
      fetchTransactions(selectedWallet);
    }
  }, [selectedWallet]);

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customers');
      const data = await response.json();
      setCustomers(data);
    } catch (error) {
      console.error('خطأ في جلب العملاء:', error);
    }
  };

  const fetchWallets = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/wallets');
      const data = await response.json();
      setWallets(data);
    } catch (error) {
      console.error('خطأ في جلب المحافظ:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTransactions = async (phone: string) => {
    try {
      const response = await fetch(`/api/wallets/${phone}/transactions`);
      const data = await response.json();
      setTransactions(data);
    } catch (error) {
      console.error('خطأ في جلب المعاملات:', error);
    }
  };

  const createWallet = async (phone: string) => {
    try {
      const response = await fetch('/api/wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerPhone: phone })
      });
      
      if (response.ok) {
        fetchWallets();
      }
    } catch (error) {
      console.error('خطأ في إنشاء المحفظة:', error);
    }
  };

  const addTransaction = async () => {
    if (!selectedWallet || !transactionForm.amount || !transactionForm.description) {
      alert('يرجى تعبئة جميع الحقول المطلوبة');
      return;
    }

    try {
      const response = await fetch(`/api/wallets/${selectedWallet}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: transactionForm.type,
          amount: parseFloat(transactionForm.amount),
          description: transactionForm.description
        })
      });
      
      if (response.ok) {
        setTransactionForm({ type: 'credit', amount: '', description: '' });
        setShowAddForm(false);
        fetchTransactions(selectedWallet);
        fetchWallets(); // تحديث الأرصدة
      }
    } catch (error) {
      console.error('خطأ في إضافة المعاملة:', error);
    }
  };

  const getCustomerName = (phone: string) => {
    const customer = customers.find(c => c.phone === phone);
    return customer ? customer.name : 'غير محدد';
  };

  const filteredWallets = wallets.filter(wallet => 
    wallet.customerPhone.includes(searchPhone) || 
    getCustomerName(wallet.customerPhone).toLowerCase().includes(searchPhone.toLowerCase())
  );

  const totalBalance = wallets.reduce((sum, wallet) => sum + parseFloat(wallet.balance), 0);
  const totalPoints = wallets.reduce((sum, wallet) => sum + wallet.loyaltyPoints, 0);

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">إدارة المحافظ الإلكترونية</h1>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center gap-3">
            <Wallet className="text-blue-600" size={24} />
            <div>
              <h3 className="text-lg font-semibold text-gray-800">إجمالي المحافظ</h3>
              <p className="text-2xl font-bold text-blue-600">{wallets.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center gap-3">
            <DollarSign className="text-green-600" size={24} />
            <div>
              <h3 className="text-lg font-semibold text-gray-800">إجمالي الأرصدة</h3>
              <p className="text-2xl font-bold text-green-600">{totalBalance.toFixed(2)} ريال</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center gap-3">
            <CreditCard className="text-orange-600" size={24} />
            <div>
              <h3 className="text-lg font-semibold text-gray-800">المحافظ النشطة</h3>
              <p className="text-2xl font-bold text-orange-600">
                {wallets.filter(w => w.isActive).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center gap-3">
            <Plus className="text-purple-600" size={24} />
            <div>
              <h3 className="text-lg font-semibold text-gray-800">نقاط الولاء</h3>
              <p className="text-2xl font-bold text-purple-600">{totalPoints}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Wallets List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">قائمة المحافظ</h2>
            </div>
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="ابحث برقم الهاتف أو الاسم..."
                value={searchPhone}
                onChange={(e) => setSearchPhone(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="p-6 text-center">جاري التحميل...</div>
            ) : filteredWallets.length === 0 ? (
              <div className="p-6 text-center text-gray-500">لا توجد محافظ</div>
            ) : (
              <div className="space-y-2 p-4">
                {filteredWallets.map((wallet) => (
                  <div
                    key={wallet.id}
                    onClick={() => setSelectedWallet(wallet.customerPhone)}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedWallet === wallet.customerPhone
                        ? 'bg-blue-50 border-blue-500'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {getCustomerName(wallet.customerPhone)}
                        </h4>
                        <p className="text-sm text-gray-600">{wallet.customerPhone}</p>
                        <p className="text-xs text-gray-500">
                          نقاط الولاء: {wallet.loyaltyPoints}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-600">
                          {parseFloat(wallet.balance).toFixed(2)} ريال
                        </p>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          wallet.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {wallet.isActive ? 'نشط' : 'غير نشط'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Transactions */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">
                {selectedWallet ? `معاملات ${getCustomerName(selectedWallet)}` : 'اختر محفظة'}
              </h2>
              {selectedWallet && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm flex items-center gap-1 hover:bg-blue-700"
                >
                  <Plus size={16} />
                  إضافة معاملة
                </button>
              )}
            </div>
          </div>

          {/* Add Transaction Form */}
          {showAddForm && selectedWallet && (
            <div className="p-6 border-b bg-gray-50">
              <h3 className="text-lg font-semibold mb-4">إضافة معاملة جديدة</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">نوع المعاملة</label>
                  <select
                    value={transactionForm.type}
                    onChange={(e) => setTransactionForm({ ...transactionForm, type: e.target.value as 'credit' | 'debit' })}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  >
                    <option value="credit">إيداع</option>
                    <option value="debit">سحب</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">المبلغ (ريال يمني)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={transactionForm.amount}
                    onChange={(e) => setTransactionForm({ ...transactionForm, amount: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الوصف</label>
                  <input
                    type="text"
                    value={transactionForm.description}
                    onChange={(e) => setTransactionForm({ ...transactionForm, description: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                    placeholder="وصف المعاملة"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={addTransaction}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                  >
                    إضافة
                  </button>
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="max-h-96 overflow-y-auto">
            {!selectedWallet ? (
              <div className="p-6 text-center text-gray-500">
                اختر محفظة لعرض المعاملات
              </div>
            ) : transactions.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                لا توجد معاملات لهذه المحفظة
              </div>
            ) : (
              <div className="space-y-2 p-4">
                {transactions.map((transaction) => (
                  <div key={transaction.id} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="flex items-center gap-2">
                          {transaction.type === 'credit' ? (
                            <Plus className="text-green-600" size={16} />
                          ) : (
                            <Minus className="text-red-600" size={16} />
                          )}
                          <span className="font-medium">
                            {transaction.type === 'credit' ? 'إيداع' : 'سحب'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{transaction.description}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(transaction.createdAt).toLocaleString('ar')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-bold ${
                          transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.type === 'credit' ? '+' : '-'}
                          {parseFloat(transaction.amount).toFixed(2)} ريال
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}