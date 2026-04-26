'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { BarChart3 } from 'lucide-react';

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
  tonKho: { count: number, klv: number },
  daBan: { count: number, klv: number }
};

type ReportData = {
  [key: string]: CategoryStats
};

function initReportData(): ReportData {
  const data: ReportData = {};
  ITEM_TYPES.forEach(t => {
    data[t.key] = { tonKho: { count: 0, klv: 0 }, daBan: { count: 0, klv: 0 } };
  });
  data['khac'] = { tonKho: { count: 0, klv: 0 }, daBan: { count: 0, klv: 0 } };
  return data;
}

export default function ReportPage() {
  const [loading, setLoading] = useState(true);
  const [reportY, setReportY] = useState<ReportData>(initReportData());
  const [reportTay, setReportTay] = useState<ReportData>(initReportData());

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
          for (const type of ITEM_TYPES) {
            // Because 'vòng' could match 'bộ vòng', we handle exact logic or just first match
            // To be precise 'bộ vòng' should be ordered before 'vòng', which we didn't, but let's do a simple check:
            if (type.keywords.some(kw => nameLower.includes(kw))) {
              // Special fix if it matches 'bộ' or 'ximen'
              if ((nameLower.includes('bộ') || nameLower.includes('ximen')) && type.key !== 'bo') {
                  typeKey = 'bo';
              } else {
                  typeKey = type.key;
              }
              break;
            }
          }
          // Fix ordering priority for 'Bộ vòng' over 'Vòng'
          if (nameLower.includes('bộ') || nameLower.includes('ximen')) {
            typeKey = 'bo';
          }

          // Aggregate
          const updateStats = (dataObj: ReportData, key: string, sold: boolean, klv: number) => {
             if (sold) {
                dataObj[key].daBan.count += 1;
                dataObj[key].daBan.klv += klv;
             } else {
                dataObj[key].tonKho.count += 1;
                dataObj[key].tonKho.klv += klv;
             }
          };

          if (hlvStr === '98') {
             updateStats(yData, typeKey, isSold, klvNum);
          } else if (hlvStr === '61') {
             updateStats(tayData, typeKey, isSold, klvNum);
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
                        <tr key={item.key} className="hover:bg-gray-50/50">
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
    </div>
  );
}
