'use client';

import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, getDocs, where, getCountFromServer } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Package, ShoppingBag, History } from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ available: 0, sold: 0 });
  const [recentTrans, setRecentTrans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
        </>
      )}
    </div>
  );
}
