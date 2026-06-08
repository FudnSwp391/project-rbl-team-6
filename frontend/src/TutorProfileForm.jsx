import { useState, useEffect, useRef } from 'react'
import { useAuth } from './AuthContext'

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

export default function TutorProfileForm() {
  const { user, token } = useAuth()
  
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })
  
  const [bio, setBio] = useState('')
  const [subjects, setSubjects] = useState('')
  const [experience, setExperience] = useState('')
  
  const [certFile, setCertFile] = useState(null)
  const [cccdFile, setCccdFile] = useState(null)
  
  const certInputRef = useRef(null)
  const cccdInputRef = useRef(null)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${API}/api/tutor/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setProfile(data)
        setBio(data.bio || '')
        setSubjects(data.subjects || '')
        setExperience(data.experience_years || '')
      }
    } catch (err) {
      console.error('Failed to fetch profile', err)
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e, setFileFn) => {
    const file = e.target.files[0]
    if (!file) return
    
    if (!file.type.startsWith('image/')) {
      setMessage({ text: 'Only image files (JPG, PNG, WEBP) are allowed.', type: 'error' })
      e.target.value = ''
      return
    }
    
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ text: 'File size must be under 5MB.', type: 'error' })
      e.target.value = ''
      return
    }
    
    setFileFn(file)
    setMessage({ text: '', type: '' })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setMessage({ text: '', type: '' })
    
    const formData = new FormData()
    formData.append('bio', bio)
    formData.append('subjects', subjects)
    formData.append('experience_years', experience)
    
    if (certFile) formData.append('certificate', certFile)
    if (cccdFile) formData.append('cccd', cccdFile)

    try {
      const res = await fetch(`${API}/api/tutor/profile`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      })
      
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Upload failed')
      
      setProfile(data)
      setMessage({ text: 'Profile submitted successfully! Status is now Pending.', type: 'success' })
      
      // Clear file inputs
      setCertFile(null)
      setCccdFile(null)
      if (certInputRef.current) certInputRef.current.value = ''
      if (cccdInputRef.current) cccdInputRef.current.value = ''
      
    } catch (err) {
      setMessage({ text: err.message, type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="p-xl text-center">Loading profile...</div>

  return (
    <div className="max-w-3xl mx-auto p-xl">
      <h2 className="text-headline-md font-bold mb-md">Tutor Profile & Documents</h2>
      
      {profile && (
        <div className={`mb-lg p-md rounded-xl border ${
          profile.status === 'approved' ? 'bg-green-50 border-green-200 text-green-800' :
          profile.status === 'rejected' ? 'bg-red-50 border-red-200 text-red-800' :
          'bg-amber-50 border-amber-200 text-amber-800'
        }`}>
          <p className="font-bold uppercase text-sm mb-1">Current Status: {profile.status}</p>
          {profile.status === 'rejected' && profile.reject_reason && (
            <p className="text-sm mt-2"><strong>Reason:</strong> {profile.reject_reason}</p>
          )}
          {profile.status === 'pending' && (
            <p className="text-sm mt-1">Your application is being reviewed by our administrators.</p>
          )}
        </div>
      )}

      {message.text && (
        <div className={`mb-lg p-sm rounded-lg text-sm font-bold ${
          message.type === 'error' ? 'bg-error text-on-error' : 'bg-green-600 text-white'
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-lg bg-surface p-lg rounded-2xl shadow-sm border border-outline-variant">
        <div>
          <label className="block text-label-md font-bold mb-xs">Professional Bio</label>
          <textarea 
            required
            className="w-full p-sm rounded-lg border border-outline-variant outline-none focus:border-primary"
            rows="4"
            value={bio}
            onChange={e => setBio(e.target.value)}
            placeholder="Tell us about yourself and your teaching style..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
          <div>
            <label className="block text-label-md font-bold mb-xs">Subjects Taught</label>
            <input 
              required
              type="text"
              className="w-full p-sm rounded-lg border border-outline-variant outline-none focus:border-primary"
              value={subjects}
              onChange={e => setSubjects(e.target.value)}
              placeholder="e.g. Math, Physics, English"
            />
          </div>
          <div>
            <label className="block text-label-md font-bold mb-xs">Years of Experience</label>
            <input 
              required
              type="number"
              min="0"
              className="w-full p-sm rounded-lg border border-outline-variant outline-none focus:border-primary"
              value={experience}
              onChange={e => setExperience(e.target.value)}
              placeholder="e.g. 3"
            />
          </div>
        </div>

        <hr className="border-outline-variant" />

        <div>
          <h3 className="text-body-lg font-bold mb-xs">Verification Documents</h3>
          <p className="text-label-sm text-on-surface-variant mb-md">
            Please upload clear images of your documents. Max 5MB per image (JPG, PNG, WEBP).
            These will be securely stored and only visible to administrators.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
            {/* Certificate */}
            <div className="p-md border border-outline-variant rounded-xl bg-surface-container-low">
              <label className="block text-label-md font-bold mb-xs">Professional Certificate</label>
              {profile?.certificate_url && !certFile && (
                <p className="text-xs text-green-600 font-bold mb-2">✓ Uploaded</p>
              )}
              <input 
                type="file" 
                accept="image/jpeg, image/png, image/webp"
                ref={certInputRef}
                onChange={e => handleFileChange(e, setCertFile)}
                className="w-full text-sm text-on-surface-variant file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                required={!profile?.certificate_url} // required if not already uploaded
              />
              {certFile && (
                <div className="mt-2 text-xs text-primary font-bold">Will upload: {certFile.name}</div>
              )}
            </div>

            {/* CCCD */}
            <div className="p-md border border-outline-variant rounded-xl bg-surface-container-low">
              <label className="block text-label-md font-bold mb-xs">CCCD / ID Card</label>
              {profile?.cccd_url && !cccdFile && (
                <p className="text-xs text-green-600 font-bold mb-2">✓ Uploaded</p>
              )}
              <input 
                type="file" 
                accept="image/jpeg, image/png, image/webp"
                ref={cccdInputRef}
                onChange={e => handleFileChange(e, setCccdFile)}
                className="w-full text-sm text-on-surface-variant file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                required={!profile?.cccd_url} // required if not already uploaded
              />
              {cccdFile && (
                <div className="mt-2 text-xs text-primary font-bold">Will upload: {cccdFile.name}</div>
              )}
            </div>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={submitting}
          className="w-full py-3 bg-primary text-on-primary rounded-xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {submitting ? 'Uploading & Submitting...' : (profile ? 'Update Profile' : 'Submit Application')}
        </button>
      </form>
    </div>
  )
}
