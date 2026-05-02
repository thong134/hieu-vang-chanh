'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { BarChart3, X } from 'lucide-react';

const ITEM_TYPES = [
  { key: 'nhan', label: 'Nhẫn', keywords: ['nhẫn', 'nhan'] },
  { key: 'bong', label: 'Bông', keywords: ['bông', 'bong', 'hoa tai', 'khuyên'] },
  { key: 'day', label: 'Dây', keywords: ['dây', 'day', 'chuyền'] },
  { key: 'vong', label: 'Vòng', keywords: ['vòng', 'vong'] },
  { key: 'lac', label: 'Lắc', keywords: ['lắc', 'lac'] },
  { key: 'mat', label: 'Mặt', keywords: ['mặt', 'mat'] },
  { key: 'kieng', label: 'Kiềng', keywords: ['kiềng', 'kieng'] },
  { key: 'bo', label: 'Bộ vòng', keywords: ['bộ', 'bo vong', 'bộ vòng', 'ximen'] }
];

type CategoryStats = {
  tonKho: { count: number, klv: number, items: any[] },
  daBan: { count: number, klv: number, items: any[] }
};

type ReportData = {
  [key: string]: CategoryStats
};

function initReportData(): ReportData {
  const data: ReportData = {};
  ITEM_TYPES.forEach(t => {
    data[t.key] = { tonKho: { count: 0, klv: 0, items: [] }, daBan: { count: 0, klv: 0, items: [] } };
  });
  data['khac'] = { tonKho: { count: 0, klv: 0, items: [] }, daBan: { count: 0, klv: 0, items: [] } };
  return data;
}

export default function ReportPage() {
  const [loading, setLoading] = useState(true);
  const [reportY, setReportY] = useState<ReportData>(initReportData());
  const [reportTay, setReportTay] = useState<ReportData>(initReportData());
  const [selectedList, setSelectedList] = useState<{ title: string, items: any[] } | null>(null);

  useEffect(() => {
    const generateReports = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'products'));
        const yData = initReportData();
        const tayData = initReportData();

        querySnapshot.docs.forEach(doc => {
          const p = doc.data();
          const hlvStr = String(p.hlv).trim();
          const nameLower = String(p.name).toLowerCase();
          const klvNum = Number(String(p.klv).replace(/,/g, '.')) || 0;
          const isSold = p.status === 'sold';

          // Determine Item Type
          let typeKey = 'khac';
          
          // Clean punctuation and pad with spaces for exact word matching
          // This prevents substring bugs (e.g. 'bộng' matching 'bộ')
          const paddedName = ' ' + nameLower.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ') + ' ';

          for (const type of ITEM_TYPES) {
            if (type.keywords.some(kw => paddedName.includes(` ${kw} `))) {
              typeKey = type.key;
              break;
            }
          }
          
          // Fix ordering priority for 'Bộ vòng' over 'Vòng' (since 'Vòng' appears before 'Bộ' in the list)
          if (paddedName.includes(' bộ ') || paddedName.includes(' ximen ') || paddedName.includes(' bộ vòng ')) {
            typeKey = 'bo';
          }

          // Aggregate
          const updateStats = (dataObj: ReportData, key: string, sold: boolean, klv: number, product: any) => {
             if (sold) {
                dataObj[key].daBan.count += 1;
                dataObj[key].daBan.klv += klv;
                dataObj[key].daBan.items.push(product);
             } else {
                dataObj[key].tonKho.count += 1;
                dataObj[key].tonKho.klv += klv;
                dataObj[key].tonKho.items.push(product);
             }
          };

          if (hlvStr === '98') {
             updateStats(yData, typeKey, isSold, klvNum, { id: doc.id, ...p });
          } else if (hlvStr === '61') {
             updateStats(tayData, typeKey, isSold, klvNum, { id: doc.id, ...p });
          }
        });

        setReportY(yData);
        setReportTay(tayData);
      } catch (error) {
        console.error("Error generating report:", error);
      } finally {
        setLoading(false);
      }
    };

    generateReports();
  }, []);

  const handleRowClick = (label: string, hlvLabel: string, stat: CategoryStats) => {
    const allItems = [...stat.tonKho.items, ...stat.daBan.items];
    if (allItems.length > 0) {
      setSelectedList({ title: `Chi tiết: ${hlvLabel} - ${label}`, items: allItems });
    }
  };

  const renderTable = (data: ReportData, title: string, colorClass: string) => {
    let totalTonKhoCount = 0, totalTonKhoKlv = 0;
    let totalDaBanCount = 0, totalDaBanKlv = 0;

    const rows = [...ITEM_TYPES, { key: 'khac', label: 'Khác', keywords: [] }];

    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden text-sm">
         <div className={`px-6 py-4 border-b border-gray-100 font-bold ${colorClass}`}>
           {title}
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-left">
               <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                     <th className="px-4 py-3 text-gray-500 font-semibold" rowSpan={2}>Loại</th>
                     <th className="px-4 py-2 border-b border-gray-200 text-center text-green-700 font-bold bg-green-50" colSpan={2}>TỒN KHO CÒN LẠI</th>
                     <th className="px-4 py-2 border-b border-gray-200 text-center text-blue-700 font-bold bg-blue-50" colSpan={2}>ĐÃ BÁN</th>
                  </tr>
                  <tr>
                     <th className="px-4 py-2 text-center text-gray-600 bg-green-50/50">Số Lượng</th>
                     <th className="px-4 py-2 text-center text-gray-600 bg-green-50/50">Trọng Lượng (KLV)</th>
                     <th className="px-4 py-2 text-center text-gray-600 bg-blue-50/50">Số Lượng</th>
                     <th className="px-4 py-2 text-center text-gray-600 bg-blue-50/50">Trọng Lượng (KLV)</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-100">
                  {rows.map(item => {
                     const stat = data[item.key];
                     totalTonKhoCount += stat.tonKho.count;
                     totalTonKhoKlv += stat.tonKho.klv;
                     totalDaBanCount += stat.daBan.count;
                     totalDaBanKlv += stat.daBan.klv;

                     return (
                        <tr key={item.key} className="hover:bg-gray-50/50 cursor-pointer transition-colors" onClick={() => handleRowClick(item.label, title, stat)}>
                           <td className="px-4 py-3 font-semibold text-gray-800">{item.label}</td>
                           <td className="px-4 py-3 text-center font-medium text-gray-900 border-l border-gray-100">{stat.tonKho.count || '-'}</td>
                           <td className="px-4 py-3 text-center text-red-600 font-semibold">{stat.tonKho.klv > 0 ? Number(stat.tonKho.klv.toFixed(3)) : '-'}</td>
                           <td className="px-4 py-3 text-center border-l font-medium text-gray-900 border-gray-100">{stat.daBan.count || '-'}</td>
                           <td className="px-4 py-3 text-center font-semibold text-blue-600">{stat.daBan.klv > 0 ? Number(stat.daBan.klv.toFixed(3)) : '-'}</td>
                        </tr>
                     );
                  })}
               </tbody>
               <tfoot className="bg-gray-100 font-bold">
                  <tr>
                     <td className="px-4 py-4 text-right text-gray-900">TỔNG CỘNG</td>
                     <td className="px-4 py-4 text-center text-gray-900 border-l border-gray-200">{totalTonKhoCount}</td>
                     <td className="px-4 py-4 text-center text-red-600">{Number(totalTonKhoKlv.toFixed(3))}</td>
                     <td className="px-4 py-4 text-center text-gray-900 border-l border-gray-200">{totalDaBanCount}</td>
                     <td className="px-4 py-4 text-center text-blue-600">{Number(totalDaBanKlv.toFixed(3))}</td>
                  </tr>
               </tfoot>
            </table>
         </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
          <BarChart3 className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Báo Cáo Tổng Hợp Kho</h1>
          <p className="text-gray-500 mt-1">Phân loại chi tiết Vàng Y, Vàng Tây và thống kê trọng lượng ròng (KLV).</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-20">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <div>
            {renderTable(reportY, "VÀNG Y (HLV 98)", "text-yellow-800 bg-yellow-100/50")}
          </div>
          <div>
            {renderTable(reportTay, "VÀNG TÂY (HLV 61)", "text-orange-800 bg-orange-100/50")}
          </div>
        </div>
      )}

      {/* Modal View */}
      {selectedList && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">{selectedList.title} <span className="text-gray-500 font-medium text-base">({selectedList.items.length} sản phẩm)</span></h2>
              <button onClick={() => setSelectedList(null)} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="overflow-y-auto p-6 flex-1">
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-gray-600">Mã Vạch</th>
                      <th className="px-4 py-3 font-semibold text-gray-600">Tên Sản Phẩm</th>
                      <th className="px-4 py-3 font-semibold text-gray-600">KLV</th>
                      <th className="px-4 py-3 font-semibold text-gray-600">Công</th>
                      <th className="px-4 py-3 font-semibold text-gray-600">Trạng Thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {selectedList.items.map((p) => {
                      let formattedLabor = '---';
                      const laborNum = Number(String(p.laborCost).replace(/,/g, ''));
                      if (!isNaN(laborNum) && laborNum > 0) {
                          formattedLabor = (laborNum * 1000).toLocaleString('vi-VN') + 'đ';
                      }
                      return (
                        <tr key={p.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{p.id}</td>
                          <td className="px-4 py-3 text-gray-700 font-medium">{p.name || '---'}</td>
                          <td className="px-4 py-3 text-gray-700 font-medium">{p.klv || '---'}</td>
                          <td className="px-4 py-3 text-gray-700 font-medium text-blue-600">{p.laborCost ? formattedLabor : '---'}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {p.status === 'sold' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">Đã bán</span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">Tồn kho</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
