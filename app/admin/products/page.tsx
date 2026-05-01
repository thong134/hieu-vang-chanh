'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import { Plus, Search, Filter, Image as ImageIcon } from 'lucide-react';
import Pagination from '@/app/components/Pagination';

const ITEMS_PER_PAGE = 20;

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'available', 'sold'
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const q = query(collection(db, 'products'), orderBy('importDate', 'desc'));
        const querySnapshot = await getDocs(q);
        const productsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setProducts(productsData);
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (p.name && p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý kho vàng</h1>
          <p className="text-gray-500 mt-1">Quản lý danh sách sản phẩm và tình trạng tồn kho.</p>
        </div>
        <Link 
          href="/admin/products/import"
          className="inline-flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2.5 px-4 rounded-xl shadow-sm transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nhập vàng mới
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text"
            placeholder="Tìm theo mã vạch hoặc tên SP..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 outline-none transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-400" />
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="py-2.5 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 outline-none transition-all font-medium text-gray-700"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="available">Tồn kho</option>
            <option value="sold">Đã bán</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-sm">
                <th className="px-6 py-4 font-semibold">Mã Vạch</th>
                <th className="px-6 py-4 font-semibold">Tên Sản Phẩm</th>
                <th className="px-6 py-4 font-semibold">HLV</th>
                <th className="px-6 py-4 font-semibold">KLV (Chỉ)</th>
                <th className="px-6 py-4 font-semibold">Công</th>
                <th className="px-6 py-4 font-semibold whitespace-nowrap">Trạng Thái</th>
                <th className="px-6 py-4 font-semibold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yellow-500 mb-2"></div>
                    <p>Đang tải dữ liệu...</p>
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    Không tìm thấy sản phẩm nào.
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((p) => {
                  let formattedLabor = '---';
                  const laborNum = Number(String(p.laborCost).replace(/,/g, ''));
                  if (!isNaN(laborNum) && laborNum > 0) {
                      formattedLabor = (laborNum * 1000).toLocaleString('vi-VN') + 'đ';
                  }

                  return (
                    <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">{p.id}</td>
                      <td className="px-6 py-4 text-gray-700 font-medium">
                        {p.name || '---'}
                      </td>
                      <td className="px-6 py-4 text-gray-700 font-semibold text-red-600">{p.hlv || '---'}</td>
                      <td className="px-6 py-4 text-gray-700 font-medium">{p.klv || '---'}</td>
                      <td className="px-6 py-4 text-gray-700 font-medium text-blue-600">{p.laborCost ? formattedLabor : '---'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {p.status === 'sold' ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Đã bán
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Tồn kho
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                         <Link 
                           href={`/admin/products/${p.id}`}
                           className="text-yellow-600 hover:text-yellow-700 font-medium text-sm hover:underline"
                         >
                           Chi tiết
                         </Link>
                      </td>
                    </tr>
                  );
                })
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
    </div>
  );
}
