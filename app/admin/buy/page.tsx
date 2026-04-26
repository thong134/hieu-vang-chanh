'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '@/lib/firebase';
import { Banknote, AlertCircle, CheckCircle2, Image as ImageIcon, X, Calculator } from 'lucide-react';

export default function BuyPage() {
  const router = useRouter();

  const [dailyPrices, setDailyPrices] = useState<any>(null);
  const [loadingPrices, setLoadingPrices] = useState(true);
  
  // Checkout Form State
  const [customerName, setCustomerName] = useState('');
  const [goldType, setGoldType] = useState('18K'); // 18K, 97%, 9999, 98%
  const [weight, setWeight] = useState(''); // KLV thực tế (chỉ)
  const [customPriceOrDeduction, setCustomPriceOrDeduction] = useState(0); // Trừ hao hoặc bù tiền thêm
  
  const [totalPrice, setTotalPrice] = useState(0); 
  const [notes, setNotes] = useState('');
  
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);

  // Fetch daily gold prices once on mount
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "goldPrices", "today"), (docSnap) => {
      if (docSnap.exists()) {
        setDailyPrices(docSnap.data().prices);
      }
      setLoadingPrices(false);
    });
    return () => unsub();
  }, []);

  // Update Total Price logic when weight/type changes
  useEffect(() => {
    if (!dailyPrices || !weight) {
      setTotalPrice(0);
      return;
    }

    let pricePerChi = 0;
    const p18k = Number(dailyPrices['18K']?.buy.replace(/\./g, '')) || 0;
    const p9999 = Number(dailyPrices['9999']?.buy.replace(/\./g, '')) || 0;
    const p97 = Number(dailyPrices['97%']?.buy.replace(/\./g, '')) || 0;

    if (goldType === '18K') pricePerChi = p18k;
    else if (goldType === '9999') pricePerChi = p9999;
    else if (goldType === '97%') pricePerChi = p97;
    else if (goldType === '98%') pricePerChi = p9999 * 0.98;

    const wNum = Number(weight.replace(/,/g, '.')) || 0;
    const baseTotal = wNum * pricePerChi;
    
    // Custom deducltion -> minus from base, but user can type freely in total anyways.
    setTotalPrice(Math.round(baseTotal - customPriceOrDeduction));

  }, [weight, goldType, customPriceOrDeduction, dailyPrices]);

  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAttachmentFile(file);
      setAttachmentPreview(URL.createObjectURL(file));
    }
  };

  const handleClear = () => {
    setCustomerName('');
    setGoldType('18K');
    setWeight('');
    setCustomPriceOrDeduction(0);
    setTotalPrice(0);
    setNotes('');
    setAttachmentFile(null);
    setAttachmentPreview(null);
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totalPrice <= 0) {
      alert("Tổng tiền chưa hợp lệ!");
      return;
    }

    setIsSubmitting(true);
    try {
      let attachmentUrl = '';
      if (attachmentFile) {
        const storageRef = ref(storage, `recycled/buy_${Date.now()}`);
        const uploadTask = uploadBytesResumable(storageRef, attachmentFile);

        await new Promise((resolve, reject) => {
          uploadTask.on('state_changed', 
            (snap) => setProgress((snap.bytesTransferred / snap.totalBytes) * 100),
            (err) => reject(err),
            async () => {
              attachmentUrl = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(true);
            }
          );
        });
      }

      const transId = `buy_${Date.now()}`;
      await setDoc(doc(db, 'recycled_gold', transId), {
        transactionId: transId,
        type: 'buy_recycled',
        date: serverTimestamp(),
        sellerEmail: auth.currentUser?.email || 'admin',
        customerName,
        goldType,
        weight: Number(weight.replace(/,/g, '.')),
        totalPrice,
        customPriceOrDeduction,
        notes,
        attachmentUrl
      });
      
      // Đồng thời lưu vào transactions để in lịch sử chung nếu cần
      await setDoc(doc(db, 'transactions', transId), {
        transactionId: transId,
        type: 'buy_recycled',
        date: serverTimestamp(),
        customerName,
        totalPrice, // Tiền này là chi ra
        notes: `Thu hồi vàng ${goldType} - ${weight} chỉ. ` + notes
      });

      alert('Đã lưu thông tin thu mua vàng thành công!');
      handleClear();
      
    } catch (error) {
      console.error(error);
      alert('Có lỗi xảy ra khi lưu giao dịch.');
    } finally {
      setIsSubmitting(false);
      setProgress(0);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Thu Mua Vàng / Tráo Đổi</h1>
        <p className="text-gray-500 mt-1">Giao diện mua lại vàng cũ từ khách hàng, tự động nhân theo giá MUA VÀO.</p>
      </div>

      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-blue-200 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-blue-600"></div>
        
        <h3 className="font-bold text-xl text-gray-900 mb-6 flex items-center gap-2">
          <Banknote className="w-6 h-6 text-blue-600" />
          Tạo Phiếu Thu Mua
        </h3>

        {loadingPrices ? (
             <div className="py-10 text-center"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500 mx-auto"></div></div>
        ) : (
          <form onSubmit={handleCheckout} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Tên khách hàng (*)</label>
                <input required value={customerName} onChange={e => setCustomerName(e.target.value)} type="text" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none transition-colors" placeholder="Vd: Nguyễn Văn B..." />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Loại vàng thu vào</label>
                <select value={goldType} onChange={e => setGoldType(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-200 outline-none">
                  <option value="18K">Vàng Tây (61%) - 18K</option>
                  <option value="98%">Vàng Y (98%)</option>
                  <option value="97%">Nhẫn 97%</option>
                  <option value="9999">Nhẫn 9999</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Khối Lượng Thực Tế (chỉ) (*)</label>
                <input required value={weight} onChange={e => setWeight(e.target.value)} type="number" step="0.001" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-200 outline-none font-semibold text-gray-900" placeholder="VD: 3.5" />
              </div>

              <div>
                <label className="block text-sm font-bold text-red-600 mb-1">Tiền Trừ Hao / Tái chế (VNĐ)</label>
                <input value={customPriceOrDeduction} onChange={e => setCustomPriceOrDeduction(Number(e.target.value))} type="number" className="w-full p-3 bg-red-50 border border-red-200 rounded-xl focus:ring-2 focus:ring-red-200 outline-none font-bold text-red-700" placeholder="VD: 150000" />
              </div>

              <div className="md:col-span-2 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-blue-800 text-lg uppercase block">Tổng Tiền Trả Khách:</span>
                  <span className="text-xs text-blue-600">(Đã nhân giá MUA VÀO và trừ hao)</span>
                </div>
                <input required value={totalPrice} onChange={e => setTotalPrice(Number(e.target.value))} type="text" className="w-full md:w-1/2 p-2 bg-transparent text-right text-3xl font-black text-blue-700 outline-none border-b-2 border-blue-300 focus:border-blue-600" />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Ghi Chú Thu Mua</label>
                <input value={notes} onChange={e => setNotes(e.target.value)} type="text" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-200 outline-none" placeholder="Hình thức món đồ đem bán..." />
              </div>

              <div className="md:col-span-2 border-t pt-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Đính Kèm Ảnh Chụp Vàng Thu Về (Tùy chọn)</label>
                <div className="flex items-center gap-4">
                  {attachmentPreview && (
                    <div className="relative w-20 h-20 rounded-lg border border-gray-200 overflow-hidden flex-shrink-0">
                      <img src={attachmentPreview} alt="Item" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => { setAttachmentFile(null); setAttachmentPreview(null) }} className="absolute -top-1 -right-1 bg-white text-red-500 p-0.5 rounded-full shadow border">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                  <div className="flex-1">
                    <label className="cursor-pointer inline-flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium shadow-sm">
                      <ImageIcon className="w-4 h-4" />
                      {attachmentFile ? 'Chọn ảnh khác...' : 'Tải lên hình ảnh...'}
                      <input type="file" className="sr-only" accept="image/*" onChange={handleAttachmentChange} />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {isSubmitting && progress > 0 && (
              <div className="text-sm font-medium text-blue-600 bg-blue-50 p-2 rounded-lg text-center">
                Đang xử lý ảnh tải lên: {Math.round(progress)}%
              </div>
            )}

            <div className="pt-4 flex gap-4">
              <button 
                type="button" 
                onClick={handleClear}
                disabled={isSubmitting}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold px-8 rounded-xl transition-colors whitespace-nowrap"
              >
                Nhập Lại
              </button>
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-black text-lg py-4 rounded-xl transition-transform active:scale-95 shadow-md flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-6 h-6" />
                XÁC NHẬN MUA VÀNG
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
