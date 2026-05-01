'use client';

import { useState } from 'react';
import { NumericFormat } from 'react-number-format';

type GoldRow = {
  id: number;
  type: string;
  buy: string;
  sell: string;
};

const INITIAL_DATA: GoldRow[] = [
  { id: 1, type: '9999', buy: '17.000.000', sell: '18.150.000' },
  { id: 2, type: '97%', buy: '16.500.000', sell: '17.650.000' },
  { id: 3, type: '18K', buy: '9.900.000', sell: '11.240.000' },
];

type Props = {
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
};

import { useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import Link from 'next/link';

export default function GoldTable({ isFullscreen, onToggleFullscreen }: Props) {
  const [data, setData] = useState<GoldRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [editingCell, setEditingCell] = useState<{ id: number; field: 'buy' | 'sell' } | null>(null);
  const [editValue, setEditValue] = useState('');

  // Define sort order and IDs for mapping
  const TYPE_ORDER = ['9999', '97%', '18K'];
  const ROW_IDS: Record<string, number> = { '9999': 1, '97%': 2, '18K': 3 };

  // Listen for Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "goldPrices", "today"), (docSnap) => {
      if (docSnap.exists()) {
        const prices = docSnap.data().prices;
        const formattedData: GoldRow[] = TYPE_ORDER.map((type) => ({
          id: ROW_IDS[type],
          type,
          buy: prices[type]?.buy || '0',
          sell: prices[type]?.sell || '0',
        }));
        setData(formattedData);
      } else {
        // Init default data if not exists
        const initialPrices = {
           "9999": { "buy": "17.000.000", "sell": "18.150.000" },
           "97%":   { "buy": "16.500.000", "sell": "17.650.000" },
           "18K":  { "buy": "9.900.000",  "sell": "11.240.000" }
        };
        // We don't write immediately to avoid loop or permisison issues on load without user action, 
        // but for "User Experience" we can just show local default or try to set it.
        // Let's just set local state to default and let first edit create the doc.
        const defaultRows: GoldRow[] = TYPE_ORDER.map(type => ({
             id: ROW_IDS[type],
             type,
             buy: initialPrices[type as keyof typeof initialPrices].buy,
             sell: initialPrices[type as keyof typeof initialPrices].sell
        }));
        setData(defaultRows);
        
        // Optional: Create the doc automatically?
        // setDoc(doc(db, "goldPrices", "today"), { prices: initialPrices, updatedAt: serverTimestamp() });
      }
      setLoading(false);
    }, (error) => {
        console.error("Firebase error:", error);
        // Fallback to static data if error (e.g. no config)
        setLoading(false);
        if (data.length === 0) setData(INITIAL_DATA);
    });

    return () => unsub();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once

  const formatCurrency = (value: string) => {
    const number = value.replace(/\D/g, '');
    return number.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const handleCellClick = (row: GoldRow, field: 'buy' | 'sell') => {
    // Open access: allow everyone to edit
    setEditingCell({ id: row.id, field });
    setEditValue(row[field]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditValue(formatCurrency(e.target.value));
  };

  const handleConfirm = async () => {
    if (editingCell) {
      const updatedRow = data.find(r => r.id === editingCell.id);
      if (!updatedRow) return;

      const newPrices = { ...getCurrentPricesObject(), [updatedRow.type]: {
          buy: editingCell.field === 'buy' ? editValue : updatedRow.buy,
          sell: editingCell.field === 'sell' ? editValue : updatedRow.sell
      }};

      try {
        await setDoc(doc(db, "goldPrices", "today"), {
            prices: newPrices,
            updatedAt: serverTimestamp()
        });
      } catch (e) {
        console.error("Error updating price:", e);
        alert("Lỗi cập nhật! Bạn có quyền sửa không?");
      }

      setEditingCell(null);
    }
  };

  const getCurrentPricesObject = () => {
      const obj: Record<string, {buy: string, sell: string}> = {};
      data.forEach(row => {
          obj[row.type] = { buy: row.buy, sell: row.sell };
      });
      return obj;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleConfirm();
    if (e.key === 'Escape') setEditingCell(null);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error", error);
    }
  };

  if (loading) return <div className="text-center text-2xl text-yellow-600 mt-10">Đang tải dữ liệu...</div>;

  return (
    <div className="w-full flex-1 flex flex-col justify-center overflow-x-auto relative">
      <div className="min-w-[800px] w-full bg-white rounded-lg shadow-xl border-4 border-yellow-500 overflow-hidden">
        <table className="w-full">
          <thead className="bg-yellow-500 text-white font-bold text-2xl md:text-3xl">
            <tr>
              <th className="py-3 px-4 w-[20%]">LOẠI VÀNG</th>
              <th className="py-3 px-4 w-[40%]">MUA VÀO</th>
              <th className="py-3 px-4 w-[40%]">BÁN RA</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr
                key={row.id}
                className={`border-b-2 border-yellow-200 ${
                  index % 2 === 0 ? 'bg-yellow-50' : 'bg-white'
                }`}
              >
                {/* Type Column */}
                <td className="py-4 text-center text-3xl md:text-5xl font-bold text-red-700">
                  {row.type}
                </td>

                {/* Buy Column */}
                <td
                  className="py-4 text-center text-4xl md:text-6xl font-bold text-blue-900 cursor-pointer hover:bg-yellow-100 transition-colors relative"
                  onClick={() => handleCellClick(row, 'buy')}
                >
                  {editingCell?.id === row.id && editingCell.field === 'buy' ? (
                    <NumericFormat
                      autoFocus
                      value={editValue.replace(/\./g, '')}
                      thousandSeparator="."
                      decimalSeparator=","
                      allowNegative={false}
                      onValueChange={(values) => {
                        setEditValue(values.formattedValue);
                      }}
                      onKeyDown={handleKeyDown}
                      onBlur={handleConfirm}
                      className="absolute inset-0 w-full h-full text-center text-4xl md:text-6xl font-bold bg-white border-2 border-blue-500 outline-none text-red-600"
                    />
                  ) : (
                    row.buy
                  )}
                </td>

                {/* Sell Column */}
                <td
                  className="py-4 text-center text-4xl md:text-6xl font-bold text-red-600 cursor-pointer hover:bg-yellow-100 transition-colors relative"
                  onClick={() => handleCellClick(row, 'sell')}
                >
                  {editingCell?.id === row.id && editingCell.field === 'sell' ? (
                    <NumericFormat
                      autoFocus
                      value={editValue.replace(/\./g, '')}
                      thousandSeparator="."
                      decimalSeparator=","
                      allowNegative={false}
                      onValueChange={(values) => {
                        setEditValue(values.formattedValue);
                      }}
                      onKeyDown={handleKeyDown}
                      onBlur={handleConfirm}
                      className="absolute inset-0 w-full h-full text-center text-4xl md:text-6xl font-bold bg-white border-2 border-red-500 outline-none text-red-600"
                    />
                  ) : (
                    row.sell
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex justify-center gap-4 items-center">
        {editingCell && (
          <button
            onClick={handleConfirm}
            className="bg-green-600 text-white text-2xl font-bold py-2 px-8 rounded-xl hover:bg-green-700 shadow-lg active:scale-95 transition-transform"
          >
            XÁC NHẬN CẬP NHẬT
          </button>
        )}
        
        {!isFullscreen && (
          <button
            onClick={onToggleFullscreen}
            className="bg-blue-600 text-white text-2xl font-bold py-2 px-8 rounded-xl hover:bg-blue-700 shadow-lg active:scale-95 transition-transform"
          >
            PHÓNG TO MÀN HÌNH
          </button>
        )}
      </div>
    </div>
  );
}
