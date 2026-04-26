'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import Link from 'next/link';
import { ArrowLeft, Save, Edit3, Image as ImageIcon, X } from 'lucide-react';

export default function ProductDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [progress, setProgress] = useState(0);

  const [formData, setFormData] = useState<any>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, 'products', id as string);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setFormData({ id: docSnap.id, ...docSnap.data() });
          if (docSnap.data().imageUrl) {
            setImagePreview(docSnap.data().imageUrl);
          }
        } else {
          alert('Sản phẩm không tồn tại!');
          router.push('/admin/products');
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setIsEditing(true); // Auto trigger edit mode when changing image
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const storageRef = ref(storage, `products/${id}_${Date.now()}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const p = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setProgress(p);
        },
        (error) => reject(error),
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        }
      );
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let imageUrl = formData.imageUrl || '';
      
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      await updateDoc(doc(db, 'products', id as string), {
        ...formData,
        imageUrl
      });

      alert('Đã cập nhật sản phẩm thành công!');
      setIsEditing(false);
      setImageFile(null);
    } catch (error) {
      console.error(error);
      alert('Có lỗi xảy ra khi lưu thay đổi!');
    } finally {
      setSaving(false);
      setProgress(0);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  if (!formData) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin/products" className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Chi tiết sản phẩm</h1>
            <p className="text-gray-500 mt-1">Xem và chỉnh sửa thông tin mã <strong>{id}</strong></p>
          </div>
        </div>
        
        {!isEditing ? (
          <button 
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-700 hover:bg-yellow-200 font-semibold rounded-xl transition-colors"
          >
            <Edit3 className="w-4 h-4" />
            Chỉnh Sửa
          </button>
        ) : (
          <button 
            onClick={() => setIsEditing(false)}
            className="px-4 py-2 bg-gray-200 text-gray-700 hover:bg-gray-300 font-semibold rounded-xl transition-colors"
          >
            Hủy Bỏ
          </button>
        )}
      </div>

      {saving && progress > 0 && (
         <div className="bg-blue-50 text-blue-800 p-3 rounded-xl flex items-center gap-3">
           <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-600"></div>
           <p className="text-sm font-medium">Đang tải ảnh: {Math.round(progress)}%</p>
         </div>
      )}

      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
        <form onSubmit={handleSave} className="space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Cột Trái - Ảnh */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Ảnh sản phẩm</label>
              <div className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 rounded-xl bg-gray-50 ${isEditing ? 'border-dashed hover:border-yellow-400 transition-colors' : ''}`}>
                <div className="space-y-2 text-center w-full">
                  {imagePreview ? (
                    <div className="relative inline-block w-full">
                      <img src={imagePreview} alt="Preview" className="max-h-64 object-contain mx-auto rounded-lg shadow-sm" />
                      {isEditing && (
                        <button 
                          type="button"
                          onClick={() => { setImageFile(null); setImagePreview(null); setFormData((prev: any) => ({...prev, imageUrl: ''})) }}
                          className="absolute -top-3 -right-3 bg-white text-red-500 rounded-full shadow border p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <>
                      <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                    </>
                  )}
                  
                  {isEditing && (
                    <div className="flex text-sm text-gray-600 justify-center mt-4">
                      <label className="relative cursor-pointer bg-white rounded-md font-medium text-yellow-600 hover:text-yellow-500 focus-within:outline-none px-4 py-2 border shadow-sm">
                        <span>Thay đổi ảnh mới</span>
                        <input name="image" type="file" className="sr-only" accept="image/*" onChange={handleImageChange} />
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Cột Phải - Thông tin */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Trạng thái</label>
                {isEditing ? (
                  <select 
                    name="status" 
                    value={formData.status} 
                    onChange={handleChange}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-200 outline-none"
                  >
                    <option value="available">Chưa bán</option>
                    <option value="sold">Đã bán</option>
                  </select>
                ) : (
                  <div className="p-3 bg-gray-50 rounded-xl border border-transparent">
                    {formData.status === 'sold' ? (
                      <span className="text-red-600 font-medium">Đã bán</span>
                    ) : (
                      <span className="text-green-600 font-medium">Tồn kho / Chưa bán</span>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Mã Vạch</label>
                <input disabled value={formData.id} type="text" className="w-full p-3 bg-gray-100 border border-gray-200 rounded-xl text-gray-500 font-medium cursor-not-allowed" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Tên Sản Phẩm</label>
                <input disabled={!isEditing} name="name" value={formData.name || ''} onChange={handleChange} type="text" className={`w-full p-3 rounded-xl border ${isEditing ? 'bg-gray-50 border-gray-200 focus:ring-2 focus:ring-yellow-200 outline-none' : 'bg-transparent border-transparent px-0 font-medium'}`} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Tiền Công</label>
                  <input disabled={!isEditing} name="laborCost" value={formData.laborCost || ''} onChange={handleChange} type="text" className={`w-full p-3 rounded-xl border ${isEditing ? 'bg-gray-50 border-gray-200 focus:ring-2' : 'bg-transparent border-transparent px-0'}`} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">KLT</label>
                  <input disabled={!isEditing} name="klt" value={formData.klt || ''} onChange={handleChange} type="text" className={`w-full p-3 rounded-xl border ${isEditing ? 'bg-gray-50 border-gray-200 focus:ring-2' : 'bg-transparent border-transparent px-0'}`} />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 border-t pt-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">KLH</label>
              <input disabled={!isEditing} name="klh" value={formData.klh || ''} onChange={handleChange} type="text" className={`w-full p-3 rounded-xl border ${isEditing ? 'bg-gray-50 border-gray-200' : 'bg-transparent border-transparent px-0'}`} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">KLV</label>
              <input disabled={!isEditing} name="klv" value={formData.klv || ''} onChange={handleChange} type="text" className={`w-full p-3 rounded-xl border ${isEditing ? 'bg-gray-50 border-gray-200' : 'bg-transparent border-transparent px-0'}`} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">HLV</label>
              <input disabled={!isEditing} name="hlv" value={formData.hlv || ''} onChange={handleChange} type="text" className={`w-full p-3 rounded-xl border ${isEditing ? 'bg-gray-50 border-gray-200' : 'bg-transparent border-transparent px-0'}`} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">KH</label>
              <input disabled={!isEditing} name="kh" value={formData.kh || ''} onChange={handleChange} type="text" className={`w-full p-3 rounded-xl border ${isEditing ? 'bg-gray-50 border-gray-200' : 'bg-transparent border-transparent px-0'}`} />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">TCCS</label>
              <input disabled={!isEditing} name="tccs" value={formData.tccs || ''} onChange={handleChange} type="text" className={`w-full p-3 rounded-xl border ${isEditing ? 'bg-gray-50 border-gray-200' : 'bg-transparent border-transparent px-0'}`} />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Nhà Sản Xuất</label>
              <input disabled={!isEditing} name="manufacturer" value={formData.manufacturer || ''} onChange={handleChange} type="text" className={`w-full p-3 rounded-xl border ${isEditing ? 'bg-gray-50 border-gray-200' : 'bg-transparent border-transparent px-0'}`} />
            </div>
          </div>

          {isEditing && (
            <div className="flex justify-end pt-4 border-t">
              <button 
                type="submit" 
                disabled={saving}
                className="bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-300 text-white font-bold py-3 px-8 rounded-xl flex items-center gap-2 transition-transform active:scale-95 shadow-md"
              >
                <Save className="w-5 h-5" />
                Lưu Thay Đổi
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
