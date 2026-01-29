'use client';

import { useState } from 'react';

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

export default function GoldTable() {
  const [data, setData] = useState<GoldRow[]>(INITIAL_DATA);
  const [editingCell, setEditingCell] = useState<{ id: number; field: 'buy' | 'sell' } | null>(null);
  const [editValue, setEditValue] = useState('');

  const formatCurrency = (value: string) => {
    // Remove non-digits
    const number = value.replace(/\D/g, '');
    // Add thousands separators
    return number.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const handleCellClick = (row: GoldRow, field: 'buy' | 'sell') => {
    setEditingCell({ id: row.id, field });
    setEditValue(row[field]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditValue(formatCurrency(e.target.value));
  };

  const handleConfirm = () => {
    if (editingCell) {
      setData((prev) =>
        prev.map((row) =>
          row.id === editingCell.id ? { ...row, [editingCell.field]: editValue } : row
        )
      );
      setEditingCell(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleConfirm();
    if (e.key === 'Escape') setEditingCell(null);
  };

  return (
    <div className="w-full flex-1 flex flex-col justify-center overflow-x-auto">
      <div className="min-w-[800px] w-full bg-white rounded-lg shadow-xl border-4 border-yellow-500">
        {/* Table Header */}
        <div className="grid grid-cols-[0.8fr_1.1fr_1.1fr] gap-x-12 bg-yellow-500 text-white font-bold text-4xl py-4 text-center items-center px-4">
          <div>LOẠI VÀNG</div>
          <div>MUA VÀO</div>
          <div>BÁN RA</div>
        </div>

        {/* Table Body */}
        <div className="flex flex-col">
          {data.map((row, index) => (
            <div
              key={row.id}
              className={`grid grid-cols-[0.8fr_1.1fr_1.1fr] gap-x-12 text-center items-center border-b-2 border-yellow-200 py-6 px-4 ${
                index % 2 === 0 ? 'bg-yellow-50' : 'bg-white'
              }`}
            >
              {/* Type Column */}
              <div className="text-6xl font-bold text-red-700">{row.type}</div>

              {/* Buy Column */}
              <div
                className="text-7xl font-bold text-blue-900 cursor-pointer hover:bg-yellow-100 transition-colors py-2"
                onClick={() => handleCellClick(row, 'buy')}
              >
                {editingCell?.id === row.id && editingCell.field === 'buy' ? (
                  <input
                    autoFocus
                    type="text"
                    value={editValue}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onBlur={handleConfirm}
                    className="w-full text-center bg-white border-2 border-blue-500 rounded outline-none text-red-600"
                  />
                ) : (
                  row.buy
                )}
              </div>

              {/* Sell Column */}
              <div
                className="text-7xl font-bold text-red-600 cursor-pointer hover:bg-yellow-100 transition-colors py-2"
                onClick={() => handleCellClick(row, 'sell')}
              >
                {editingCell?.id === row.id && editingCell.field === 'sell' ? (
                  <input
                    autoFocus
                    type="text"
                    value={editValue}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onBlur={handleConfirm}
                    className="w-full text-center bg-white border-2 border-red-500 rounded outline-none text-red-600"
                  />
                ) : (
                  row.sell
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {editingCell && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={handleConfirm}
            className="bg-green-600 text-white text-3xl font-bold py-3 px-10 rounded-xl hover:bg-green-700 shadow-lg active:scale-95 transition-transform"
          >
            XÁC NHẬN CẬP NHẬT
          </button>
        </div>
      )}
    </div>
  );
}
