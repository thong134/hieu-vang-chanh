'use client';

import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/'); // Redirect to home on success
    } catch (err: any) {
      console.error(err);
      setError('Đăng nhập thất bại. Vui lòng kiểm tra lại email/mật khẩu.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-50 to-white px-4">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border-2 border-yellow-400">
        <h1 className="text-3xl font-black text-yellow-700 text-center mb-6 uppercase">
          Quản Lý Giá Vàng
        </h1>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-gray-700 font-bold mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@hieuvang.com"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 outline-none transition-all text-lg"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 font-bold mb-2">Mật khẩu</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 outline-none transition-all text-lg"
              required
            />
          </div>

          {error && (
            <div className="text-red-600 bg-red-50 p-3 rounded-lg text-center font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 rounded-xl shadow-md transition-transform active:scale-95 text-xl"
          >
            ĐĂNG NHẬP
          </button>
        </form>

        <div className="mt-6 text-center">
          <a href="/" className="text-gray-500 hover:text-yellow-600 underline">
            &larr; Quay lại bảng giá
          </a>
        </div>
      </div>
    </div>
  );
}
