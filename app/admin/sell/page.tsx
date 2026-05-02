'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '@/lib/firebase';
import { ScanBarcode, AlertCircle, ShoppingCart, CheckCircle2, Image as ImageIcon, X, Calculator } from 'lucide-react';
import { NumericFormat } from 'react-number-format';

export default function SellPage() {
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [barcode, setBarcode] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  
  const [product, setProduct] = useState<any>(null);
  const [dailyPrices, setDailyPrices] = useState<any>(null);
  
  // Checkout Form State
  const [customerName, setCustomerName] = useState('');
  const [totalPrice, setTotalPrice] = useState(0); // Will be calculated
  const [discount, setDiscount] = useState(0); 
  const [goldPriceAtTime, setGoldPriceAtTime] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);

  // Auto focus barcode
  useEffect(() => {
    if (searchInputRef.current) searchInputRef.current.focus();
    
    // Fetch daily gold prices once on mount
    const unsub = onSnapshot(doc(db, "goldPrices", "today"), (docSnap) => {
      if (docSnap.exists()) {
        setDailyPrices(docSnap.data().prices);
      }
    });
    return () => unsub();
  }, []);

  const calculateSuggestedPrice = (prodData: any, prices: any) => {
    if (!prices) return { pricePerChi: 0, labor: 0, suggestedTotal: 0, textDesc: 'Chưa cập nhật giá vàng' };
    
    let pricePerChi = 0;
    let textDesc = '';
    const hlvStr = String(prodData.hlv).trim();
    const nameLower = String(prodData.name).toLowerCase();
    
    // Parse prices, removing dots
    const p18k = Number(prices['18K']?.sell.replace(/\./g, '')) || 0;
    const p9999 = Number(prices['9999']?.sell.replace(/\./g, '')) || 0;
    const p97 = Number(prices['97%']?.sell.replace(/\./g, '')) || 0;

    if (nameLower.includes('nhẫn trơn') || nameLower.includes('nhan tron')) {
       // Nhẫn trơn: depends on what they usually map it to. Let's use 9999 prices
       pricePerChi = p9999;
       textDesc = `Giá Nhẫn Trơn (9999): ${pricePerChi.toLocaleString('vi-VN')}/chỉ`;
    } else if (hlvStr === '61') {
       pricePerChi = p18k;
       textDesc = `Giá Vàng Tây (18K): ${pricePerChi.toLocaleString('vi-VN')}/chỉ`;
    } else if (hlvStr === '98') {
       pricePerChi = p9999 * 0.98;
       textDesc = `Giá Vàng Y (98%): ${pricePerChi.toLocaleString('vi-VN')}/chỉ (Tham chiếu từ 9999)`;
    } else {
       // Cứ tạm lấy 9999 nếu không rõ
       pricePerChi = p9999;
       textDesc = `Giá mặc định (9999): ${pricePerChi.toLocaleString('vi-VN')}/chỉ`;
    }

    const klvNum = Number(String(prodData.klv).replace(/,/g, '.')) || 0;
    const laborNum = Number(String(prodData.laborCost).replace(/,/g, '')) * 1000 || 0; // Công 200 => 200,000

    const suggestedTotal = (klvNum * pricePerChi) + laborNum;

    return { 
      klv: klvNum,
      pricePerChi, 
      labor: laborNum, 
      suggestedTotal: Math.round(suggestedTotal), 
      textDesc 
    };
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcode.trim()) return;

    setIsSearching(true);
    setSearchError('');
    setProduct(null);

    try {
      const docRef = doc(db, 'products', barcode.trim());
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const prodData = docSnap.data();
        if (prodData.status === 'sold') {
          setSearchError('Sản phẩm này đã được bán thành công trước đó!');
        } else {
          setProduct({ id: docSnap.id, ...prodData });
          
          // Auto calculate
          const calc = calculateSuggestedPrice(prodData, dailyPrices);
          const rawTotal = calc.suggestedTotal;
          // Làm tròn xuống hàng chục nghìn (VD: 17234300 -> 17230000)
          const roundedTotal = Math.floor(rawTotal / 10000) * 10000;
          const autoDiscount = rawTotal - roundedTotal;

          setTotalPrice(rawTotal);
          setDiscount(autoDiscount);
          setGoldPriceAtTime(calc.textDesc);
        }
      } else {
        setSearchError('Không tìm thấy sản phẩm với mã vạch này trong kho.');
      }
    } catch (error) {
      console.error(error);
      setSearchError('Đã xảy ra lỗi khi tìm kiếm.');
    } finally {
      setIsSearching(false);
    }
  };

  const clearForm = () => {
    setProduct(null);
    setBarcode('');
    setCustomerName('');
    setTotalPrice(0);
    setDiscount(0);
    setGoldPriceAtTime('');
    setPaymentMethod('cash');
    setNotes('');
    setAttachmentFile(null);
    setAttachmentPreview(null);
    if (searchInputRef.current) searchInputRef.current.focus();
  };

  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAttachmentFile(file);
      setAttachmentPreview(URL.createObjectURL(file));
    }
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    setIsSubmitting(true);
    try {
      let attachmentUrl = '';
      if (attachmentFile) {
        const storageRef = ref(storage, `attachments/sell_${product.id}_${Date.now()}`);
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

      await updateDoc(doc(db, 'products', product.id), { status: 'sold' });

      const transId = `sell_${product.id}_${Date.now()}`;
      await setDoc(doc(db, 'transactions', transId), {
        transactionId: transId,
        productId: product.id,
        type: 'sell',
        date: serverTimestamp(),
        sellerEmail: auth.currentUser?.email || 'admin',
        customerName,
        totalPrice: totalPrice - discount,
        discount,
        goldPriceAtTime,
        paymentMethod,
        notes,
        attachmentUrl
      });

      alert('Thanh toán và lưu thông tin thành công!');
      clearForm();
      
    } catch (error) {
      console.error(error);
      alert('Có lỗi xảy ra khi thanh toán.');
    } finally {
      setIsSubmitting(false);
      setProgress(0);
    }
  };

  const calcInfo = product ? calculateSuggestedPrice(product, dailyPrices) : null;
  const finalPrice = totalPrice - discount;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Giao dịch Bán Hàng</h1>
        <p className="text-gray-500 mt-1">Quét mã vạch và hệ thống tự nội suy Thành tiền.</p>
      </div>

      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
        <form onSubmit={handleSearch} className="relative">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Tìm Sản Phẩm (Mã Vạch / Barcode ID)</label>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <ScanBarcode className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Ví dụ: 102456... Giữ chuột tại đây khi quẹt máy scan"
                className="w-full pl-12 pr-4 py-4 text-lg bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-yellow-500 focus:ring-4 focus:ring-yellow-200/50 outline-none font-medium transition-all"
                disabled={!!product}
              />
            </div>
            {!product ? (
              <button 
                type="submit" 
                disabled={isSearching}
                className="bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-300 text-white font-bold px-8 rounded-xl transition-colors whitespace-nowrap"
              >
                {isSearching ? 'Đang tìm...' : 'Tìm kiếm'}
              </button>
            ) : (
              <button 
                type="button" 
                onClick={clearForm}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold px-8 rounded-xl transition-colors whitespace-nowrap"
              >
                Nhập Lại
              </button>
            )}
          </div>
        </form>

        {searchError && (
          <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-xl flex items-start gap-3 border border-red-100">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="font-medium">{searchError}</p>
          </div>
        )}
      </div>

      {product && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Thông tin sản phẩm vừa quét */}
          <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              Sản phẩm đã chọn
            </h3>
            <div className="space-y-4">
              {product.imageUrl ? (
                <div className="w-full aspect-square bg-gray-100 rounded-xl border border-gray-200 overflow-hidden">
                  <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-full aspect-square bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-center">
                  <ImageIcon className="w-12 h-12 text-gray-300" />
                </div>
              )}
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-gray-500">Mã/Tên:</span>
                  <span className="font-semibold text-right">{product.id} - {product.name}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-gray-500">Loại Vàng (HLV):</span>
                  <span className="font-semibold">{product.hlv}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-gray-500">Trọng lượng (KLV):</span>
                  <span className="font-semibold text-red-600">{product.klv} chỉ</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-gray-500">Tiền Công (VNĐ):</span>
                  <span className="font-semibold text-yellow-600 font-bold">{calcInfo?.labor.toLocaleString('vi-VN')} đ</span>
                </div>
              </div>
              
              <div className="pt-4 mt-4 border-t border-dashed border-gray-200">
                <div className="flex items-start gap-2 p-3 bg-blue-50 text-blue-800 rounded-xl text-xs leading-relaxed">
                  <Calculator className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block mb-1">Mức giá tham chiếu:</span>
                    {calcInfo?.textDesc}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Form Chốt Sale */}
          <div className="lg:col-span-2 bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-yellow-200 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-400 to-yellow-600"></div>
            
            <h3 className="font-bold text-xl text-gray-900 mb-6 flex items-center gap-2">
              <ShoppingCart className="w-6 h-6 text-yellow-600" />
              Chốt Đơn Khách Hàng
            </h3>

            <form onSubmit={handleCheckout} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Tên khách hàng (*)</label>
                  <input required value={customerName} onChange={e => setCustomerName(e.target.value)} type="text" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-200 focus:border-yellow-500 outline-none transition-colors" placeholder="Vd: Nguyễn Văn A..." />
                </div>
                
                <div className="md:col-span-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Ghi Chú Giá Vàng Tính Bill</label>
                  <input disabled value={goldPriceAtTime} type="text" className="w-full p-3 bg-gray-100 border border-gray-200 rounded-xl text-xs text-gray-700 outline-none" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Tính Tự Động (KLV * Giá + Công)</label>
                  <NumericFormat 
                    required 
                    value={totalPrice} 
                    onValueChange={(values) => setTotalPrice(values.floatValue || 0)} 
                    thousandSeparator="."
                    decimalSeparator=","
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-200 outline-none font-semibold text-gray-900" 
                    allowLeadingZeros={false}
                  />
                </div>

                <div>
                  <div className="flex justify-between items-end mb-1">
                    <label className="block text-sm font-bold text-red-600">Giảm Giá (Trừ bớt đi)</label>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setDiscount(d => d + 10000)} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200 font-bold transition-colors">+10k</button>
                      <button type="button" onClick={() => setDiscount(d => d + 20000)} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200 font-bold transition-colors">+20k</button>
                    </div>
                  </div>
                  <NumericFormat 
                    value={discount} 
                    onValueChange={(values) => setDiscount(values.floatValue || 0)} 
                    thousandSeparator="."
                    decimalSeparator=","
                    className="w-full p-3 bg-red-50 border border-red-200 rounded-xl focus:ring-2 focus:ring-red-200 outline-none font-bold text-red-700" 
                    placeholder="VD: 50.000" 
                    allowLeadingZeros={false}
                  />
                </div>

                <div className="md:col-span-2 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl flex items-center justify-between">
                  <span className="font-bold text-yellow-800 text-lg">TỔNG KHÁCH CẦN THANH TOÁN:</span>
                  <span className="text-3xl font-black text-red-600">{finalPrice.toLocaleString('vi-VN')} VNĐ</span>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Hình Thức Thanh Toán</label>
                  <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-200 outline-none">
                    <option value="cash">Tiền Mặt</option>
                    <option value="bank">Chuyển Khoản</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Ghi Chú Đơn Hàng</label>
                  <input value={notes} onChange={e => setNotes(e.target.value)} type="text" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-200 focus:border-yellow-500 outline-none" placeholder="..." />
                </div>

                <div className="md:col-span-2 border-t pt-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Đính Kèm Giấy Tờ (CCCD, Bill Chuyển Khoản)</label>
                  <div className="flex items-center gap-4">
                    {attachmentPreview && (
                      <div className="relative w-20 h-20 rounded-lg border border-gray-200 overflow-hidden flex-shrink-0">
                        <img src={attachmentPreview} alt="Bill" className="w-full h-full object-cover" />
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
                  Đang xử lý ảnh đính kèm: {Math.round(progress)}%
                </div>
              )}

              <div className="pt-4">
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-300 text-white font-black text-lg py-4 rounded-xl transition-transform active:scale-95 shadow-md flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-6 h-6" />
                  XÁC NHẬN THANH TOÁN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
