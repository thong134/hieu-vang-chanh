'use client';

import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, getDocs, where, getCountFromServer } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Package, ShoppingBag, History, Calculator } from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ available: 0, sold: 0 });
  const [recentTrans, setRecentTrans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Gold age measurement states 24K
  const [dryWeight24, setDryWeight24] = useState<string>('');
  const [wetWeight24, setWetWeight24] = useState<string>('');
  const [goldAge24, setGoldAge24] = useState<number | null>(null);

  // Gold age measurement states 18K
  const [dryWeight18, setDryWeight18] = useState<string>('');
  const [wetWeight18, setWetWeight18] = useState<string>('');
  const [goldAge18, setGoldAge18] = useState<number | null>(null);

  const calculateGoldAge24 = () => {
    const dry = parseFloat(dryWeight24);
    const wet = parseFloat(wetWeight24);
    if (dry > 0 && wet > 0) {
      const age = (23.0284 * wet / dry) - 20.8390;
      setGoldAge24(age);
    } else {
      setGoldAge24(null);
    }
  };

  const calculateGoldAge18 = () => {
    const dry = parseFloat(dryWeight18);
    const wet = parseFloat(wetWeight18);
    if (dry > 0 && wet > 0) {
      const age = (17.0814 * wet / dry) - 15.1968;
      setGoldAge18(age);
    } else {
      setGoldAge18(null);
    }
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Count available
        const availQuery = query(collection(db, 'products'), where('status', '==', 'available'));
        const availSnap = await getCountFromServer(availQuery);
        
        // Count sold
        const soldQuery = query(collection(db, 'products'), where('status', '==', 'sold'));
        const soldSnap = await getCountFromServer(soldQuery);

        setStats({
          available: availSnap.data().count,
          sold: soldSnap.data().count
        });

        // Get 5 recent transactions
        const transQuery = query(collection(db, 'transactions'), orderBy('date', 'desc'), limit(5));
        const transDocs = await getDocs(transQuery);
        setRecentTrans(transDocs.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (error) {
        console.error("Dashboard fetch error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tổng quan</h1>
        <p className="text-gray-500 mt-1">Theo dõi tình hình kinh doanh và tồn kho của cửa hàng.</p>
      </div>

      {loading ? (
        <div className="flex justify-center p-10"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-yellow-500"></div></div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1 */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Package className="w-8 h-8" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Sản phẩm tồn kho</p>
                <h3 className="text-4xl font-black text-gray-900 mt-1">{stats.available}</h3>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Tổng sản phẩm đã bán</p>
                <h3 className="text-4xl font-black text-gray-900 mt-1">{stats.sold}</h3>
              </div>
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-2">
              <History className="w-5 h-5 text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900">Giao dịch gần đây</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-sm">
                    <th className="px-6 py-3 font-semibold">Mã SP / Barcode</th>
                    <th className="px-6 py-3 font-semibold">Loại GD</th>
                    <th className="px-6 py-3 font-semibold">Thời gian</th>
                    <th className="px-6 py-3 font-semibold">Khách Hàng (nếu có)</th>
                    <th className="px-6 py-3 font-semibold text-right">Chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentTrans.length === 0 ? (
                     <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-500">Chưa có giao dịch.</td></tr>
                  ) : (
                     recentTrans.map(t => (
                       <tr key={t.id} className="hover:bg-gray-50">
                         <td className="px-6 py-4 font-medium text-gray-900">{t.productId}</td>
                         <td className="px-6 py-4">
                            {t.type === 'import' ? (
                              <span className="inline-flex px-2 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-md uppercase tracking-wider">Nhập Mới</span>
                            ) : (
                              <span className="inline-flex px-2 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-md uppercase tracking-wider">Bán Ra</span>
                            )}
                         </td>
                         <td className="px-6 py-4 text-sm text-gray-500">
                           {t.date?.toDate ? t.date.toDate().toLocaleString('vi-VN') : '---'}
                         </td>
                         <td className="px-6 py-4 text-sm text-gray-700">
                           {t.type === 'sell' && t.customerName ? t.customerName : '---'}
                         </td>
                         <td className="px-6 py-4 text-sm font-medium text-right text-gray-900">
                           {t.type === 'sell' && t.totalPrice ? `${t.totalPrice} đ` : '---'}
                         </td>
                       </tr>
                     ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Gold Age Measurement Tools */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-6">
            {/* 24K Tool */}
            <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                  <Calculator className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Đo Tuổi Vàng 24K</h2>
                  <p className="text-gray-500 text-sm mt-1">Hệ số 24K: 23.0284 và 20.8390</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 items-end mb-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Cân khô (g)</label>
                  <input 
                    type="number" 
                    value={dryWeight24} 
                    onChange={(e) => setDryWeight24(e.target.value)} 
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-200 outline-none transition-colors" 
                    placeholder="VD: 12.5" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Cân ướt (g)</label>
                  <input 
                    type="number" 
                    value={wetWeight24} 
                    onChange={(e) => setWetWeight24(e.target.value)} 
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-200 outline-none transition-colors" 
                    placeholder="VD: 11.2" 
                  />
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <button 
                  onClick={calculateGoldAge24}
                  className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-xl transition-colors shadow-sm whitespace-nowrap"
                >
                  Xác Nhận Đo
                </button>
                
                <div className="text-center sm:text-right flex-1">
                  <span className="text-gray-500 text-xs block mb-1 uppercase tracking-wider font-semibold">Kết quả 24K:</span>
                  {goldAge24 !== null ? (
                    <span className="text-xl md:text-2xl font-black text-red-600">
                      {goldAge24.toFixed(4)} <span className="text-base text-red-700/80">({(goldAge24 * 100).toFixed(2)}%)</span>
                    </span>
                  ) : (
                    <span className="text-xl font-medium text-gray-400">---</span>
                  )}
                </div>
              </div>
            </div>

            {/* 18K Tool */}
            <div className="bg-white rounded-2xl shadow-sm border border-yellow-100 p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-yellow-50 text-yellow-600 flex items-center justify-center">
                  <Calculator className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Đo Tuổi Vàng 18K</h2>
                  <p className="text-gray-500 text-sm mt-1">Hệ số 18K: 17.0814 và 15.1968</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 items-end mb-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Cân khô (g)</label>
                  <input 
                    type="number" 
                    value={dryWeight18} 
                    onChange={(e) => setDryWeight18(e.target.value)} 
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-200 outline-none transition-colors" 
                    placeholder="VD: 12.5" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Cân ướt (g)</label>
                  <input 
                    type="number" 
                    value={wetWeight18} 
                    onChange={(e) => setWetWeight18(e.target.value)} 
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-200 outline-none transition-colors" 
                    placeholder="VD: 11.2" 
                  />
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <button 
                  onClick={calculateGoldAge18}
                  className="w-full sm:w-auto bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 px-6 rounded-xl transition-colors shadow-sm whitespace-nowrap"
                >
                  Xác Nhận Đo
                </button>
                
                <div className="text-center sm:text-right flex-1">
                  <span className="text-gray-500 text-xs block mb-1 uppercase tracking-wider font-semibold">Kết quả 18K:</span>
                  {goldAge18 !== null ? (
                    <span className="text-xl md:text-2xl font-black text-yellow-600">
                      {goldAge18.toFixed(4)} <span className="text-base text-yellow-700/80">({(goldAge18 * 100).toFixed(2)}%)</span>
                    </span>
                  ) : (
                    <span className="text-xl font-medium text-gray-400">---</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
