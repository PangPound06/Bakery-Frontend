'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    fullname: '',  // ✅ เปลี่ยนเป็น fullname
    email: '',
    phone: '',
    address: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // ตรวจสอบการ login
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      setFormData({
        fullname: parsedUser.fullname || '',  // ✅ เปลี่ยนเป็น fullname
        email: parsedUser.email || '',
        phone: parsedUser.phone || '',
        address: parsedUser.address || '',
      });
    } catch (error) {
      console.error('Error parsing user data:', error);
      router.push('/login');
    }
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8080/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      const data = await response.json();
      
      // อัพเดท localStorage
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      setIsEditing(false);
      alert('อัพเดทข้อมูลสำเร็จ! ✅');
      
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('เกิดข้อผิดพลาดในการอัพเดทข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="text-amber-600 hover:text-amber-700 font-medium flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            กลับหน้าหลัก
          </Link>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-orange-600 to-amber-600 px-8 py-6">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-amber-500 flex items-center justify-center text-white text-3xl font-bold">
                {user.fullname?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
              </div>
              <div className="text-white">
                <h1 className="text-2xl font-bold">{user.fullname || 'ผู้ใช้งาน'}</h1>
                <p className="text-amber-100">{user.email}</p>
              </div>
            </div>
          </div>

          {/* Content Section */}
          <div className="p-8">
            {!isEditing ? (
              // View Mode
              <div className="space-y-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-800">ข้อมูลส่วนตัว</h2>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    แก้ไขข้อมูล
                  </button>
                </div>

                <div className="grid gap-4">
                  <div className="border-b border-gray-200 pb-4">
                    <label className="text-sm font-medium text-gray-500">ชื่อ-นามสกุล</label>
                    <p className="text-lg text-gray-800 mt-1">{user.fullname || '-'}</p>
                  </div>

                  <div className="border-b border-gray-200 pb-4">
                    <label className="text-sm font-medium text-gray-500">อีเมล</label>
                    <p className="text-lg text-gray-800 mt-1">{user.email}</p>
                  </div>

                  <div className="border-b border-gray-200 pb-4">
                    <label className="text-sm font-medium text-gray-500">เบอร์โทรศัพท์</label>
                    <p className="text-lg text-gray-800 mt-1">{user.phone || '-'}</p>
                  </div>

                  <div className="pb-4">
                    <label className="text-sm font-medium text-gray-500">ที่อยู่</label>
                    <p className="text-lg text-gray-800 mt-1">{user.address || '-'}</p>
                  </div>
                </div>
              </div>
            ) : (
              // Edit Mode
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-800">แก้ไขข้อมูลส่วนตัว</h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="fullname" className="block text-sm font-medium text-gray-700 mb-2">
                      ชื่อ-นามสกุล
                    </label>
                    <input
                      id="fullname"
                      name="fullname"
                      type="text"
                      value={formData.fullname}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      placeholder="กรอกชื่อ-นามสกุล"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      อีเมล
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      disabled
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                      เบอร์โทรศัพท์
                    </label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      placeholder="0xx-xxx-xxxx"
                    />
                  </div>

                  <div>
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                      ที่อยู่
                    </label>
                    <textarea
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      placeholder="กรอกที่อยู่สำหรับจัดส่ง"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {loading ? '🔄 กำลังบันทึก...' : '💾 บันทึกข้อมูล'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setFormData({
                        fullname: user.fullname || '',  // ✅ เปลี่ยนเป็น fullname
                        email: user.email || '',
                        phone: user.phone || '',
                        address: user.address || '',
                      });
                    }}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 rounded-lg transition-colors"
                  >
                    ยกเลิก
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}