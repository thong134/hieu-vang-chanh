'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import * as XLSX from 'xlsx';
import { Upload, Save, ArrowLeft, FileSpreadsheet, ImageIcon, X } from 'lucide-react';
import Link from 'next/link';

export default function ImportProductPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'manual' | 'excel'>('manual');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Manual Form State
  const [formData, setFormData] = useState({
    id: '', // MÃ VẠCH
    name: '', // TÊN SẢN PHẨM
    manufacturer: '', // NHÀ SẢN XUẤT
    address: '', // ĐỊA CHỈ
    tccs: '', // TCCS
    kh: '', // KH
    hlv: '', // HLV
    laborCost: '', // CÔNG
    klt: '', // KLT
    klh: '', // KLH
    klv: '', // KLV
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Excel State
  const [excelData, setExcelData] = useState<any[]>([]);
  const [excelFile, setExcelFile] = useState<File | null>(null);

  const handleManualChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const uploadImage = async (file: File, barcode: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const storageRef = ref(storage, `products/${barcode}_${Date.now()}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const p = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setProgress(p);
        },
        (error) => {
          console.error("Upload error", error);
          reject(error);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        }
      );
    });
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.id) {
      alert("Mã vạch là bắt buộc!");
      return;
    }

    setLoading(true);
    try {
      let imageUrl = '';
      if (imageFile) {
        imageUrl = await uploadImage(imageFile, formData.id);
      }

      await setDoc(doc(db, 'products', formData.id), {
        ...formData,
        imageUrl,
        status: 'available',
        importDate: serverTimestamp(),
      });

      // Record transaction
      await setDoc(doc(db, 'transactions', `import_${formData.id}_${Date.now()}`), {
        productId: formData.id,
        type: 'import',
        date: serverTimestamp(),
      });

      alert("Nhập sản phẩm thành công!");
      router.push('/admin/products');
    } catch (error) {
      console.error(error);
      alert("Có lỗi xảy ra khi lưu!");
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setExcelFile(file);

      const reader = new FileReader();
      reader.onload = (evt) => {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        setExcelData(data);
      };
      reader.readAsBinaryString(file);
    }
  };

  const handleExcelSubmit = async () => {
    if (excelData.length === 0) return;
    setLoading(true);

    try {
      for (let i = 0; i < excelData.length; i++) {
        const row = excelData[i];
        
        // Excel columns: 
        // MÃ VẠCH, TÊN SẢN PHẨM, NHÀ SẢN XUẤT, ĐỊA CHỈ, TCCS, KH, HLV, CÔNG (Nghìn VNĐ), KLT(chỉ), KLH(chỉ), KLV(chỉ)
        // Normalize keys (as spaces and cases might vary)
        const getVal = (keyPart: string) => {
          const key = Object.keys(row).find(k => k.toLowerCase().includes(keyPart.toLowerCase()));
          return key ? row[key]?.toString() || '' : '';
        };

        const idVal = getVal('mã vạch') || getVal('ma vach') || getVal('id');
        if (!idVal) continue; // Skip if no barcode

        const productDoc = {
          id: idVal,
          name: getVal('tên'),
          manufacturer: getVal('nhà sản xuất'),
          address: getVal('địa chỉ'),
          tccs: getVal('tccs'),
          kh: getVal('kh'),
          hlv: getVal('hlv'),
          laborCost: getVal('công'),
          klt: getVal('klt'),
          klh: getVal('klh'),
          klv: getVal('klv'),
          imageUrl: '',
          status: 'available',
          importDate: serverTimestamp()
        };

        await setDoc(doc(db, 'products', idVal), productDoc);
        await setDoc(doc(db, 'transactions', `import_${idVal}_${Date.now()}`), {
          productId: idVal,
          type: 'import',
          date: serverTimestamp(),
        });
      }
      alert(`Đã import thành công ${excelData.length} sản phẩm!`);
      router.push('/admin/products');
    } catch (error) {
      console.error(error);
      alert("Lỗi khi import excel!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/products" className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nhập Vàng Mới</h1>
          <p className="text-gray-500 mt-1">Thêm sản phẩm đơn lẻ hoặc import hàng loạt từ Excel.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button 
          onClick={() => setActiveTab('manual')}
          className={`px-6 py-3 font-medium text-sm transition-colors relative ${activeTab === 'manual' ? 'text-yellow-600' : 'text-gray-500 hover:text-gray-800'}`}
        >
          Nhập Thủ Công
          {activeTab === 'manual' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-yellow-500" />}
        </button>
        <button 
          onClick={() => setActiveTab('excel')}
          className={`px-6 py-3 font-medium text-sm transition-colors relative flex items-center gap-2 ${activeTab === 'excel' ? 'text-green-600' : 'text-gray-500 hover:text-gray-800'}`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Import từ Excel
          {activeTab === 'excel' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500" />}
        </button>
      </div>

      {loading && (
        <div className="bg-blue-50 text-blue-800 p-4 rounded-xl flex items-center gap-3">
          <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-600"></div>
          <div>
            <p className="font-medium">Đang xử lý dữ liệu...</p>
            {progress > 0 && <p className="text-sm border-t border-blue-200 mt-1 pt-1">Đang tải ảnh: {Math.round(progress)}%</p>}
          </div>
        </div>
      )}

      {/* Form Nhập Thủ Công */}
      {activeTab === 'manual' && (
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
          <form onSubmit={handleManualSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Ảnh sản phẩm thực tế</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-xl hover:border-yellow-400 transition-colors bg-gray-50">
                  <div className="space-y-2 text-center">
                    {imagePreview ? (
                      <div className="relative inline-block">
                        <img src={imagePreview} alt="Preview" className="max-h-64 rounded-lg shadow-sm" />
                        <button 
                          type="button"
                          onClick={() => { setImageFile(null); setImagePreview(null); }}
                          className="absolute -top-3 -right-3 bg-white text-red-500 rounded-full shadow border p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                        <div className="flex text-sm text-gray-600 justify-center">
                          <label className="relative cursor-pointer bg-white rounded-md font-medium text-yellow-600 hover:text-yellow-500 focus-within:outline-none px-2 py-1">
                            <span>Tải ảnh lên</span>
                            <input name="image" type="file" className="sr-only" accept="image/*" onChange={handleImageChange} />
                          </label>
                        </div>
                        <p className="text-xs text-gray-500">PNG, JPG up to 5MB</p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Mã Vạch (*)</label>
                <input required name="id" value={formData.id} onChange={handleManualChange} type="text" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-200 focus:border-yellow-500 outline-none transition-all" placeholder="1038194..." />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Tên Sản Phẩm (*)</label>
                <input required name="name" value={formData.name} onChange={handleManualChange} type="text" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-200 focus:border-yellow-500 outline-none transition-all" placeholder="Nhẫn NT..." />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Trọng Lượng Tổng (KLT)</label>
                <input name="klt" value={formData.klt} onChange={handleManualChange} type="text" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-200 focus:border-yellow-500 outline-none" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Tiền Công (Nghìn VNĐ)</label>
                <input name="laborCost" value={formData.laborCost} onChange={handleManualChange} type="text" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-200 focus:border-yellow-500 outline-none" placeholder="100, 200..." />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Khối Lượng Hột (KLH)</label>
                <input name="klh" value={formData.klh} onChange={handleManualChange} type="text" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-200 focus:border-yellow-500 outline-none" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Khối Lượng Vàng (KLV)</label>
                <input name="klv" value={formData.klv} onChange={handleManualChange} type="text" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-200 focus:border-yellow-500 outline-none" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Hàm Lượng Vàng (HLV)</label>
                <input name="hlv" value={formData.hlv} onChange={handleManualChange} type="text" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-200 focus:border-yellow-500 outline-none" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Ký Hiệu (KH)</label>
                <input name="kh" value={formData.kh} onChange={handleManualChange} type="text" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-200 focus:border-yellow-500 outline-none" />
              </div>

              <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 border-t pt-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">TCCS</label>
                  <input name="tccs" value={formData.tccs} onChange={handleManualChange} type="text" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-200 focus:border-yellow-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Nhà Sản Xuất</label>
                  <input name="manufacturer" value={formData.manufacturer} onChange={handleManualChange} type="text" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-200 focus:border-yellow-500 outline-none" />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button 
                type="submit" 
                disabled={loading}
                className="bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-300 text-white font-bold py-3 px-8 rounded-xl flex items-center gap-2 transition-transform active:scale-95"
              >
                <Save className="w-5 h-5" />
                Lưu Sản Phẩm
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Import Excel */}
      {activeTab === 'excel' && (
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6">
          <div className="bg-green-50 text-green-800 p-4 rounded-xl text-sm leading-relaxed border border-green-100">
            <p className="font-semibold mb-2">Hướng dẫn Import file Excel:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>File phải có dòng đầu tiên là dòng tiêu đề (Header).</li>
              <li>Các cột cần thiết: <strong>Mã vạch, Tên sản phẩm, TCCS, KH, HLV, Công, Nhà sản xuất...</strong></li>
              <li>Hệ thống sẽ tự nhận diện qua từ khóa. Các cột thiếu sẽ bị bỏ qua.</li>
            </ul>
          </div>

          <div className="border-2 border-gray-300 border-dashed rounded-2xl p-10 text-center hover:bg-gray-50 hover:border-green-400 transition-colors">
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <div className="text-sm text-gray-600">
              <label className="relative cursor-pointer bg-white rounded-md font-medium text-green-600 hover:text-green-500">
                <span className="bg-green-100 px-4 py-2 rounded-lg">Chọn File Excel (.xlsx, .xls)</span>
                <input type="file" className="sr-only" accept=".xlsx, .xls, .csv" onChange={handleExcelUpload} />
              </label>
            </div>
            {excelFile && <p className="mt-4 text-sm text-gray-900 font-medium">Đã chọn: {excelFile.name}</p>}
          </div>

          {excelData.length > 0 && (
            <div>
              <p className="mb-4 font-medium text-gray-700">Tìm thấy <strong>{excelData.length}</strong> dòng dữ liệu hợp lệ.</p>
              <div className="overflow-x-auto border border-gray-200 rounded-xl max-h-64">
                 <table className="w-full text-left text-sm">
                   <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                     <tr>
                       {Object.keys(excelData[0]).map((key, i) => (
                         <th key={i} className="p-3 font-semibold text-gray-600 whitespace-nowrap">{key}</th>
                       ))}
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100">
                     {excelData.slice(0, 5).map((row, i) => (
                       <tr key={i}>
                         {Object.values(row).map((val: any, j) => (
                           <td key={j} className="p-3 whitespace-nowrap text-gray-600">{val}</td>
                         ))}
                       </tr>
                     ))}
                   </tbody>
                 </table>
              </div>
              {excelData.length > 5 && (
                <p className="text-xs text-gray-400 mt-2 text-center italic">Đang hiển thị 5 dòng đầu tiên / {excelData.length} dòng</p>
              )}
              
              <div className="mt-6 flex justify-end">
                <button 
                  onClick={handleExcelSubmit} 
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-bold py-3 px-8 rounded-xl flex items-center gap-2 transition-transform active:scale-95"
                >
                  <Save className="w-5 h-5" />
                  Bắt đầu Import {excelData.length} SP
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
