// frontend/src/pages/candidate/Profile.jsx
// Owner: Shivani
// SRS REQ-16: candidate views / edits personal and contact details + profile picture.
// Email and CNIC are shown but cannot be changed (they identify the account).
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api, { getErrorMessage, getFieldErrors } from '../../services/api';
import { Alert, Avatar, Button, Card, Input, Select, Spinner } from '../../components/ui';

const GENDERS = [
  { value: 'NOT_SPECIFIED', label: 'Prefer not to say' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'MALE', label: 'Male' },
  { value: 'OTHER', label: 'Other' },
];
const MAX_BYTES = 2 * 1024 * 1024;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function Profile() {
  const { updateUser } = useAuth();
  const fileRef = useRef(null);

  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ full_name: '', phone: '', address: '', city: '', gender: 'NOT_SPECIFIED', highest_qualification: '' });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pictureBusy, setPictureBusy] = useState(false);

  const fill = (p) => {
    setProfile(p);
    setForm({
      full_name: p.full_name || '',
      phone: p.phone || '',
      address: p.address || '',
      city: p.city || '',
      gender: p.gender || 'NOT_SPECIFIED',
      highest_qualification: p.highest_qualification || '',
    });
  };

  useEffect(() => {
    api
      .get('/candidate/profile')
      .then(({ data }) => fill(data.profile))
      .catch((err) => setMessage({ type: 'error', text: getErrorMessage(err) }))
      .finally(() => setLoading(false));
  }, []);

  const onChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: '' });
  };

  const onSave = async (e) => {
    e.preventDefault();
    const next = {};
    if (!form.full_name.trim()) next.full_name = 'This field is required.';
    if (!/^\+?\d{10,15}$/.test(form.phone.replace(/[\s-]/g, ''))) next.phone = 'Please enter a valid phone number.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const { data } = await api.put('/candidate/profile', form);
      fill(data.profile);
      updateUser({ full_name: data.profile.full_name });
      setMessage({ type: 'success', text: data.message });
    } catch (err) {
      setErrors(getFieldErrors(err));
      setMessage({ type: 'error', text: getErrorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  const onPickFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow choosing the same file again
    if (!file) return;
    if (!TYPES.includes(file.type)) {
      setMessage({ type: 'error', text: 'Only JPG, PNG or WEBP images are allowed.' });
      return;
    }
    if (file.size > MAX_BYTES) {
      setMessage({ type: 'error', text: 'Image must be 2 MB or smaller.' });
      return;
    }

    const body = new FormData();
    body.append('picture', file);
    setPictureBusy(true);
    setMessage({ type: '', text: '' });
    try {
      const { data } = await api.post('/candidate/profile/picture', body);
      setProfile((p) => ({ ...p, profile_picture_url: data.profile_picture_url }));
      updateUser({ profile_picture_url: data.profile_picture_url }); // navbar picture updates too
      setMessage({ type: 'success', text: data.message });
    } catch (err) {
      setMessage({ type: 'error', text: getErrorMessage(err) });
    } finally {
      setPictureBusy(false);
    }
  };

  const onRemovePicture = async () => {
    setPictureBusy(true);
    try {
      const { data } = await api.delete('/candidate/profile/picture');
      setProfile((p) => ({ ...p, profile_picture_url: null }));
      updateUser({ profile_picture_url: null });
      setMessage({ type: 'success', text: data.message });
    } catch (err) {
      setMessage({ type: 'error', text: getErrorMessage(err) });
    } finally {
      setPictureBusy(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20 text-rust"><Spinner label="Loading profile" /></div>;
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-10">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">My Profile</h1>
        <p className="mt-1 text-sm text-muted">These details are used to pre-fill your applications.</p>
      </div>

      <Alert type={message.type || 'info'}>{message.text}</Alert>

      {profile && (
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          {/* Picture card */}
          <Card className="flex flex-col items-center gap-3 p-6 text-center lg:w-[300px] lg:shrink-0">
            <div className="relative">
              <Avatar name={profile.full_name} src={profile.profile_picture_url} size={112} />
              {pictureBusy && (
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-white/70 text-rust">
                  <Spinner label="Uploading" />
                </span>
              )}
            </div>
            <p className="font-heading text-xl font-bold">{profile.full_name}</p>
            <p className="break-all text-sm text-muted">{profile.email}</p>

            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={onPickFile} aria-label="Choose profile picture" />
            <Button variant="secondary" fullWidth onClick={() => fileRef.current?.click()} disabled={pictureBusy}>
              {profile.profile_picture_url ? 'Change photo' : 'Upload photo'}
            </Button>
            {profile.profile_picture_url && (
              <Button variant="ghost" className="text-danger" onClick={onRemovePicture} disabled={pictureBusy}>Remove photo</Button>
            )}
            <p className="text-xs text-muted">JPG, PNG or WEBP, up to 2 MB.</p>

            <div className="mt-2 flex w-full flex-col gap-1.5 text-left">
              <div className="flex justify-between text-[13px] font-medium">
                <span>Profile complete</span>
                <span>{profile.completeness}%</span>
              </div>
              <div className="h-2 rounded-full bg-cream" role="progressbar" aria-valuenow={profile.completeness} aria-valuemin={0} aria-valuemax={100} aria-label="Profile completeness">
                <div className="h-2 rounded-full bg-rust" style={{ width: `${profile.completeness}%` }} />
              </div>
            </div>
          </Card>

          {/* Details form */}
          <Card className="flex-1 p-6">
            <form onSubmit={onSave} noValidate className="grid gap-4 md:grid-cols-2">
              <Input label="Full name" name="full_name" value={form.full_name} onChange={onChange} error={errors.full_name} required className="md:col-span-2" />
              <Input label="Email" value={profile.email} disabled hint="Email cannot be changed." />
              <Input label="CNIC" value={profile.cnic || ''} disabled hint="CNIC cannot be changed." />
              <Input label="Phone number" name="phone" type="tel" value={form.phone} onChange={onChange} error={errors.phone} required />
              <Input label="City" name="city" value={form.city} onChange={onChange} error={errors.city} />
              <Input label="Address" name="address" value={form.address} onChange={onChange} error={errors.address} className="md:col-span-2" />
              <Input label="Highest qualification" name="highest_qualification" placeholder="e.g. BS Computer Science" value={form.highest_qualification} onChange={onChange} error={errors.highest_qualification} />
              <Select label="Gender (optional)" name="gender" value={form.gender} onChange={onChange} options={GENDERS} />
              <p className="text-xs text-muted md:col-span-2">Gender is optional and is never used for scoring.</p>
              <div className="md:col-span-2">
                <Button type="submit" loading={saving}>Save profile</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
