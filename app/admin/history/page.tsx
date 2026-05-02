'use client';

import { useEffect, useState } from 'react';
import { collection, query, orderBy, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { History, Filter, Search, Calendar, Clock, Eye, X } from 'lucide-react';
import Pagination from '@/app/components/Pagination';

const ITEMS_PER_PAGE = 20;

export default function TransactionsHistoryPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [filterType, setFilterType] = useState('all'); 
  const [dateFilter, setDateFilter] = useState('today'); // all, today, week, month
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, dateFilter, searchTerm]);

  // Lấy 500 giao dịch gần nhất
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const q = query(collection(db, 'transactions'), orderBy('date', 'desc'), limit(500));
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setTransactions(data);
      } catch (error) {
        console.error("Lỗi khi tải lịch sử giao dịch:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  const filteredTrans = transactions.filter(t => {
    const term = searchTerm.toLowerCase();
    const matchSearch = 
        (t.customerName && t.customerName.toLowerCase().includes(term)) ||
        (t.productId && t.productId.toLowerCase().includes(term)) ||
        (t.notes && t.notes.toLowerCase().includes(term));

    const matchType = filterType === 'all' || t.type === filterType;

    let matchDate = true;
    if (dateFilter !== 'all' && t.date?.toDate) {
      const transDate = t.date.toDate();
      const now = new Date();
      
      if (dateFilter === 'today') {
        matchDate = transDate.toDateString() === now.toDateString();
      } else if (dateFilter === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        matchDate = transDate >= weekAgo;
      } else if (dateFilter === 'month') {
        const monthAgo = new Date();
        // Lấy từ ngày mùng 1 đầu tháng cho đúng nghĩa (hoặc 30 ngày trước)
        // Dùng 30 ngày trước cho linh hoạt:
        monthAgo.setDate(now.getDate() - 30);
        matchDate = transDate >= monthAgo;
      }
    }

    return matchSearch && matchType && matchDate;
  });

  const totalPages = Math.ceil(filteredTrans.length / ITEMS_PER_PAGE);
  const paginatedTrans = filteredTrans.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const getTypeLabel = (type: string) => {
    switch(type) {
      case 'sell': return <span className="inline-flex px-2 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-md uppercase">Bán Vàng</span>;
      case 'buy_recycled': return <span className="inline-flex px-2 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-md uppercase">Thu Mua</span>;
      case 'import': return <span className="inline-flex px-2 py-1 bg-purple-50 text-purple-700 text-xs font-bold rounded-md uppercase">Nhập Kho</span>;
      default: return <span className="inline-flex px-2 py-1 bg-gray-50 text-gray-700 text-xs font-bold rounded-md uppercase">{type}</span>;
    }
  };

  const calculateTotalSell = () => {
    return filteredTrans
      .filter(t => t.type === 'sell' && t.totalPrice)
      .reduce((sum, t) => sum + Number(t.totalPrice), 0);
  };

  const calculateTotalBuy = () => {
    return filteredTrans
      .filter(t => t.type === 'buy_recycled' && t.totalPrice)
      .reduce((sum, t) => sum + Number(t.totalPrice), 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center">
          <History className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sổ Lịch Sử Giao Dịch</h1>
          <p className="text-gray-500 mt-1">Quản lý và tra cứu toàn bộ giao dịch Bán Ra / Thu Mua.</p>
        </div>
      </div>

      {/* Tổng Quát Ngắn */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <div className="p-6 rounded-2xl border-2 border-green-200 bg-green-50/50 flex flex-col justify-center">
            <p className="text-green-700 font-bold mb-1 uppercase text-sm tracking-widest">Tổng Thu Vàng Bán Ra</p>
            <p className="text-3xl font-black text-green-700">{calculateTotalSell().toLocaleString('vi-VN')} đ</p>
         </div>
         <div className="p-6 rounded-2xl border-2 border-blue-200 bg-blue-50/50 flex flex-col justify-center">
            <p className="text-blue-700 font-bold mb-1 uppercase text-sm tracking-widest">Tổng Chi Tiền Thu Mua Cũ</p>
            <p className="text-3xl font-black text-blue-700">{calculateTotalBuy().toLocaleString('vi-VN')} đ</p>
         </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col lg:flex-row gap-4">
        
        {/* Lọc thời gian mới được thêm vào */}
        <div className="flex items-center gap-2 lg:w-1/4">
          <Clock className="w-5 h-5 text-gray-400 flex-shrink-0" />
          <select 
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full py-2.5 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:border-yellow-500 focus:ring-2 outline-none font-bold text-gray-800"
          >
            <option value="today">Hôm nay</option>
            <option value="week">Trong 7 ngày qua</option>
            <option value="month">Trong 30 ngày tới đây</option>
            <option value="all">Toàn thời gian</option>
          </select>
        </div>

        <div className="flex flex-1 items-center gap-2">
          <Filter className="w-5 h-5 text-gray-400" />
          <select 
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full lg:w-auto py-2.5 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:border-yellow-500 focus:ring-2 outline-none font-medium text-gray-700"
          >
            <option value="all">Tất Cả Loại</option>
            <option value="sell">Chỉ Bán Ra</option>
            <option value="buy_recycled">Chỉ Thu Cũ</option>
            <option value="import">Chỉ Nhập Mới</option>
          </select>
        </div>

        <div className="relative flex-[2]">
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text"
            placeholder="Tìm theo Khách hàng, Mã SP, Hoặc Ghi chú..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 outline-none transition-all"
          />
        </div>
      </div>

      {/* Box Lịch Sử */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-sm">
                <th className="px-6 py-4 font-semibold">Thời Gian</th>
                <th className="px-6 py-4 font-semibold">Phân Loại</th>
                <th className="px-6 py-4 font-semibold">Khách Hàng</th>
                <th className="px-6 py-4 font-semibold">Mã / Chi Tiết</th>
                <th className="px-6 py-4 font-semibold text-right">Thành Tiền (VNĐ)</th>
                <th className="px-6 py-4 font-semibold text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-yellow-500 mb-2"></div>
                    <p>Đang tải dòng thời gian...</p>
                  </td>
                </tr>
              ) : filteredTrans.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    Không tìm thấy giao dịch nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                paginatedTrans.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-800">
                      <div className="flex items-center gap-2">
                         <Calendar className="w-4 h-4 text-gray-400" />
                         {t.date?.toDate ? t.date.toDate().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : 'Không rõ'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getTypeLabel(t.type)}
                    </td>
                    <td className="px-6 py-4 text-gray-700 font-semibold">
                      {t.customerName || '---'}
                    </td>
                    <td className="px-6 py-4">
                      {t.type === 'sell' && t.productId && (
                        <p className="font-medium text-gray-900 border border-gray-200 bg-gray-50 rounded px-2 py-0.5 inline-block text-xs">Mã: {t.productId}</p>
                      )}
                      {(t.notes) && (
                        <p className="text-gray-500 text-sm mt-1">{t.notes}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {t.totalPrice ? (
                        <span className={`font-bold text-lg ${t.type === 'sell' ? 'text-green-600' : 'text-blue-600'}`}>
                           {t.type !== 'sell' && t.type !== 'import' ? '-' : '+'}{Number(t.totalPrice).toLocaleString('vi-VN')}
                        </span>
                      ) : (
                         <span className="text-gray-400">---</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => setSelectedTransaction(t)}
                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-yellow-600 transition-colors inline-block"
                        title="Xem chi tiết"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <Pagination 
          currentPage={currentPage} 
          totalPages={totalPages} 
          onPageChange={setCurrentPage} 
        />
      )}

      {selectedTransaction && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50 rounded-t-2xl">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <History className="w-6 h-6 text-yellow-600" />
                Chi Tiết Giao Dịch
              </h2>
              <button onClick={() => setSelectedTransaction(null)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="overflow-y-auto p-6 space-y-6">
              {/* Info Header */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500 block mb-1">Mã Giao Dịch</span>
                  <span className="font-semibold break-all">{selectedTransaction.id}</span>
                </div>
                <div>
                  <span className="text-gray-500 block mb-1">Loại Giao Dịch</span>
                  {getTypeLabel(selectedTransaction.type)}
                </div>
                <div>
                  <span className="text-gray-500 block mb-1">Thời Gian</span>
                  <span className="font-semibold">
                    {selectedTransaction.date?.toDate ? selectedTransaction.date.toDate().toLocaleString('vi-VN') : 'Không rõ'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block mb-1">Khách Hàng</span>
                  <span className="font-semibold text-yellow-700">{selectedTransaction.customerName || 'Khách Lẻ'}</span>
                </div>
              </div>

              {/* Product Info */}
              {selectedTransaction.productId && (
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <h4 className="font-semibold text-gray-800 mb-3 text-sm uppercase tracking-wide">Thông tin Sản phẩm</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between border-b border-gray-100 pb-2">
                      <span className="text-gray-600">Mã sản phẩm:</span>
                      <span className="font-semibold">{selectedTransaction.productId}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Pricing Info */}
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                <h4 className="font-semibold text-blue-800 mb-3 text-sm uppercase tracking-wide">Chi tiết Thanh toán</h4>
                <div className="space-y-3 text-sm">
                  {selectedTransaction.type === 'sell' && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tổng cộng (Tạm tính):</span>
                        <span className="font-semibold">{Number((selectedTransaction.totalPrice || 0) + (selectedTransaction.discount || 0)).toLocaleString('vi-VN')} đ</span>
                      </div>
                      <div className="flex justify-between text-red-600">
                        <span>Giảm giá:</span>
                        <span className="font-semibold">- {Number(selectedTransaction.discount || 0).toLocaleString('vi-VN')} đ</span>
                      </div>
                      <div className="border-t border-blue-200 pt-2 flex justify-between items-center">
                        <span className="font-bold text-gray-800 text-base">Thực thu:</span>
                        <span className="text-xl font-black text-blue-700">{Number(selectedTransaction.totalPrice || 0).toLocaleString('vi-VN')} đ</span>
                      </div>
                    </>
                  )}
                  {selectedTransaction.type !== 'sell' && (
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-gray-800 text-base">Thành tiền:</span>
                      <span className="text-xl font-black text-blue-700">{Number(selectedTransaction.totalPrice || 0).toLocaleString('vi-VN')} đ</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between pt-2 border-t border-blue-200/50 mt-2">
                    <span className="text-gray-600">Phương thức:</span>
                    <span className="font-semibold uppercase">{selectedTransaction.paymentMethod === 'bank' ? 'Chuyển Khoản' : 'Tiền Mặt'}</span>
                  </div>
                </div>
              </div>

              {/* Notes & Attachment */}
              {(selectedTransaction.notes || selectedTransaction.attachmentUrl) && (
                <div className="space-y-4">
                  {selectedTransaction.notes && (
                    <div>
                      <span className="text-sm font-semibold text-gray-700 block mb-1">Ghi chú:</span>
                      <p className="p-3 bg-yellow-50 rounded-xl text-yellow-800 text-sm">{selectedTransaction.notes}</p>
                    </div>
                  )}
                  {selectedTransaction.attachmentUrl && (
                    <div>
                      <span className="text-sm font-semibold text-gray-700 block mb-2">Ảnh đính kèm (Hóa đơn / CCCD):</span>
                      <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50 flex items-center justify-center p-2">
                        <img src={selectedTransaction.attachmentUrl} alt="Đính kèm" className="max-h-64 object-contain rounded-lg" />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
