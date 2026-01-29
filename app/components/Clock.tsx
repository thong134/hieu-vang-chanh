'use client';

import { useState, useEffect } from 'react';

export default function Clock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Format: 13:19:00, Thứ Năm, 29/01/2026
  const timeString = time.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const dateString = time.toLocaleDateString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  // Capitalize first letter of weekday
  const formattedDate = dateString.charAt(0).toUpperCase() + dateString.slice(1);

  return (
    <div className="text-center mb-4">
      <div className="text-3xl font-bold bg-gray-100 rounded-lg py-2 shadow-sm inline-block px-8 text-blue-600">
        {timeString}, {formattedDate}
      </div>
    </div>
  );
}
