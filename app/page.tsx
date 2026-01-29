'use client';

import { useEffect, useState } from 'react';
import Clock from './components/Clock';
import GoldTable from './components/GoldTable';

export default function Home() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleDoubleClick = () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch((e) => {
          console.error(`Error attempting to enable fullscreen mode: ${e.message} (${e.name})`);
        });
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (document.fullscreenElement && e.clientY < 10) {
        document.exitFullscreen();
      }
    };

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('dblclick', handleDoubleClick);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('dblclick', handleDoubleClick);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((e) => {
        console.error(`Error attempting to enable fullscreen mode: ${e.message} (${e.name})`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-yellow-50 to-white pt-6 px-4 flex flex-col items-center">
      {/* 1. Đồng hồ thời gian thực */}
      <Clock />

      {/* 2. Tiêu đề chính + 3. Tiêu đề phụ */}
      <div className="text-center mb-6 relative mt-4 md:mt-6">
        <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-yellow-700 tracking-tight drop-shadow-sm mb-2 uppercase flex items-center gap-2 md:gap-4 justify-center whitespace-nowrap">
          <span>💍</span> HIỆU VÀNG CHÁNH <span>✨</span>
        </h1>
        <h2 className="text-xl md:text-3xl lg:text-4xl font-bold text-gray-700 uppercase bg-yellow-300 inline-block px-6 md:px-10 py-1 md:py-2 rounded-full shadow-md mt-2 md:mt-4">
          Giá vàng hôm nay
        </h2>
      </div>

      {/* 4. Bảng giá */}
      <div className="w-full max-w-[98%] lg:max-w-[90%] flex-1 flex flex-col mb-4">
         <GoldTable isFullscreen={isFullscreen} onToggleFullscreen={toggleFullscreen} />
      </div>
    </main>
  );
}
