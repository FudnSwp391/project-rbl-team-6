import React, { useState, useEffect } from 'react'
import { useAuth } from '../AuthContext'

export default function StudentProfilePage() {
  const { token, user } = useAuth()
  const [profile, setProfile] = useState({
    full_name: '',
    email: '',
    phone: '',
    city: '',
    picture: ''
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/student/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const result = await res.json()
      if (result.success) {
        setProfile({
          full_name: result.data.full_name || '',
          email: result.data.email || '',
          phone: result.data.phone || '',
          city: result.data.city || '',
          picture: result.data.picture || ''
        })
      }
    } catch (error) {
      console.error('Error fetching profile', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [])



  const handleChange = (e) => {
    const { name, value } = e.target
    setProfile(prev => ({ ...prev, [name]: value }))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage({ type: '', text: '' })

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/student/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(profile)
      })
      const result = await res.json()
      if (result.success) {
        setMessage({ type: 'success', text: 'Cập nhật thông tin thành công!' })
      } else {
        setMessage({ type: 'error', text: result.message || 'Có lỗi xảy ra.' })
      }
    } catch (error) {
      console.error('Error updating profile', error)
      setMessage({ type: 'error', text: 'Lỗi máy chủ.' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="p-xl text-center text-on-surface-variant font-body-md">Đang tải hồ sơ...</div>
  }

  return (
    <div className="max-w-2xl mx-auto bg-surface-container-lowest p-xl rounded-[24px] shadow-sm border border-outline-variant/30">
      <h2 className="font-headline-sm text-on-surface mb-lg">Hồ sơ cá nhân</h2>
      
      {message.text && (
        <div className={`p-md mb-lg rounded-lg text-sm font-medium ${message.type === 'success' ? 'bg-[#d1e7dd] text-[#0f5132]' : 'bg-[#f8d7da] text-[#842029]'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-lg">
        <div className="flex flex-col gap-sm">
          <label className="font-label-md text-on-surface">Ảnh đại diện (URL)</label>
          <div className="flex items-center gap-md">
            {profile.picture ? (
              <img src={profile.picture} alt="Avatar" className="w-16 h-16 rounded-full object-cover border border-outline-variant" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant">
                <span className="material-symbols-outlined text-[32px]">person</span>
              </div>
            )}
            <input
              type="text"
              name="picture"
              value={profile.picture}
              onChange={handleChange}
              className="flex-1 px-md py-sm rounded-xl border border-outline-variant bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="https://..."
            />
          </div>
        </div>

        <div className="flex flex-col gap-sm">
          <label className="font-label-md text-on-surface">Email (Không thể thay đổi)</label>
          <input
            type="email"
            name="email"
            value={profile.email}
            disabled
            className="px-md py-sm rounded-xl border border-outline-variant bg-surface-container text-on-surface-variant cursor-not-allowed"
          />
        </div>

        <div className="flex flex-col gap-sm">
          <label className="font-label-md text-on-surface">Họ và tên</label>
          <input
            type="text"
            name="full_name"
            value={profile.full_name}
            onChange={handleChange}
            required
            className="px-md py-sm rounded-xl border border-outline-variant bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <div className="flex flex-col gap-sm">
          <label className="font-label-md text-on-surface">Số điện thoại</label>
          <input
            type="text"
            name="phone"
            value={profile.phone}
            onChange={handleChange}
            className="px-md py-sm rounded-xl border border-outline-variant bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <div className="flex flex-col gap-sm">
          <label className="font-label-md text-on-surface">Thành phố</label>
          <input
            type="text"
            name="city"
            value={profile.city}
            onChange={handleChange}
            className="px-md py-sm rounded-xl border border-outline-variant bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <div className="flex justify-end pt-md">
          <button
            type="submit"
            disabled={saving}
            className="px-xl py-sm bg-primary text-on-primary rounded-full font-label-lg font-bold hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </form>
    </div>
  )
}
