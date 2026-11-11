
// Email and CNIC are shown but cannot be changed (they identify the account).
// The profile must be 100% complete (all fields + picture) before the candidate can apply.
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api, { getErrorMessage, getFieldErrors } from '../../services/api';
import Icon from '../../components/candidate/Icon';
import ProgressRing from '../../components/candidate/ProgressRing';
import { Alert, Avatar, Button, Input, RadioGroup, Select, Spinner } from '../../components/ui';

const GENDER_TO_LABEL = { MALE: 'Male', FEMALE: 'Female', OTHER: 'Other' };
const LABEL_TO_GENDER = { Male: 'MALE', Female: 'FEMALE', Other: 'OTHER' };
const QUALIFICATIONS = ['Matric / O-Level', 'Intermediate / A-Level', 'Diploma', "Bachelor's", "Master's", 'MPhil / PhD'];
const CHECKLIST = ['Full name', 'Phone number', 'Gender', 'City', 'Address', 'Highest qualification', 'Profile picture'];
const MAX_BYTES = 2 * 1024 * 1024;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function Section({ title, subtitle, children }) {
  return (
    <fieldset className="border-b border-line px-6 py-6 last:border-0 sm:px-8">
      <legend className="sr-only">{title}</legend>
      <h2 className="text-base font-semibold">{title}</h2>
      {subtitle && <p className="mt-0.5 text-[13px] text-muted">{subtitle}</p>}
      <div className="mt-5 grid gap-5 md:grid-cols-2">{children}</div>
    </fieldset>
  );
}

export default function Profile() {
  const { updateUser } = useAuth();
  const fileRef = useRef(null);

  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ full_name: '', phone: '', address: '', city: '', gender: '', highest_qualification: '' });
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
      gender: p.gender || '',
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

  const set = (name, value) => {
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((e) => ({ ...e, [name]: '' }));
  };
  const onChange = (e) => {
    const { name, value } = e.target;
    set(name, name === 'phone' ? value.replace(/[^\d+]/g, '').slice(0, 13) : value);
  };

  const onSave = async (e) => {
    e.preventDefault();
    const next = {};
    if (!form.full_name.trim()) next.full_name = 'This field is required.';
    if (!form.phone) next.phone = 'This field is required.';
    else if (!/^\+?\d{10,15}$/.test(form.phone)) next.phone = 'Please enter a valid phone number.';
    if (!form.gender) next.gender = 'Please select your gender.';
    if (!form.city.trim()) next.city = 'This field is required.';
    if (!form.address.trim()) next.address = 'This field is required.';
    if (!form.highest_qualification) next.highest_qualification = 'This field is required.';
    setErrors(next);
    if (Object.keys(next).length) {
      setMessage({ type: 'error', text: 'Please fill in the highlighted fields.' });
      return;
    }

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
      updateUser({ profile_picture_url: data.profile_picture_url }); // navbar picture updates too
      const fresh = await api.get('/candidate/profile');
      setProfile(fresh.data.profile); // keeps the unsaved form as it is
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
      updateUser({ profile_picture_url: null });
      const fresh = await api.get('/candidate/profile');
      setProfile(fresh.data.profile);
      setMessage({ type: 'success', text: data.message });
    } catch (err) {
      setMessage({ type: 'error', text: getErrorMessage(err) });
    } finally {
      setPictureBusy(false);
    }
  };

  if (loading) return <div className="flex justify-center py-24 text-rust"><Spinner label="Loading profile" /></div>;

  const complete = profile?.completeness === 100;
  const qualificationOptions = [
    ...QUALIFICATIONS,
    ...(form.highest_qualification && !QUALIFICATIONS.includes(form.highest_qualification) ? [form.highest_qualification] : []),
  ].map((q) => ({ value: q, label: q }));

  return (
    <div className="flex flex-col">
      <section className="bg-cream">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-8">
          <h1 className="animate-fade-up text-[30px] font-semibold leading-tight tracking-tight sm:text-[36px]">My profile</h1>
          <p className="mt-2 max-w-2xl text-[15px] text-muted">
            Your profile is your first impression. <em>A complete profile pre-fills every application, so you can apply in minutes.</em>
          </p>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-10 sm:px-8">
        <Alert type={message.type || 'info'}>{message.text}</Alert>

        {profile && complete && (
          <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-success-soft px-5 py-4 text-sm text-success">
            <Icon name="check" className="h-5 w-5" />
            <span className="flex-1">Your profile is 100% complete. You can apply for any open position.</span>
            <Link to="/candidate/vacancies" className="font-medium underline underline-offset-4">Browse positions</Link>
          </div>
        )}

        {profile && (
          <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start">
            {/* ---------------- Identity card ---------------- */}
            <aside className="animate-fade-up overflow-hidden rounded-3xl border border-line bg-white lg:sticky lg:top-24">
              <div className="h-24 bg-brown" aria-hidden="true">
                <div className="h-full w-full bg-[radial-gradient(circle_at_80%_20%,rgba(242,169,0,0.35),transparent_55%)]" />
              </div>
              <div className="-mt-12 flex flex-col items-center px-6 pb-6 text-center">
                <div className="relative">
                  <span className="block rounded-full ring-4 ring-white">
                    <Avatar name={profile.full_name} src={profile.profile_picture_url} size={104} />
                  </span>
                  {pictureBusy && (
                    <span className="absolute inset-0 flex items-center justify-center rounded-full bg-white/70 text-rust"><Spinner label="Uploading" /></span>
                  )}
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={pictureBusy}
                    aria-label={profile.profile_picture_url ? 'Change photo' : 'Upload photo'}
                    className="absolute -bottom-1 -right-1 flex h-10 w-10 items-center justify-center rounded-full bg-amber text-brown ring-4 ring-white hover:bg-amber-dark disabled:opacity-60"
                  >
                    <Icon name="camera" />
                  </button>
                </div>
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={onPickFile} aria-label="Choose profile picture" />

                <p className="mt-4 text-lg font-semibold">{profile.full_name}</p>
                <p className="break-all text-sm text-muted">{profile.email}</p>
                <div className="mt-2 flex gap-3 text-[13px]">
                  <button type="button" onClick={() => fileRef.current?.click()} disabled={pictureBusy} className="min-h-9 font-medium underline underline-offset-4 hover:text-rust">
                    {profile.profile_picture_url ? 'Change photo' : 'Upload photo'}
                  </button>
                  {profile.profile_picture_url && (
                    <button type="button" onClick={onRemovePicture} disabled={pictureBusy} className="min-h-9 text-danger hover:underline">Remove</button>
                  )}
                </div>
                <p className="text-xs italic text-muted">JPG, PNG or WEBP, up to 2 MB</p>

                <div className="mt-6 w-full rounded-2xl bg-paper p-4 text-left">
                  <div className="flex items-center gap-4">
                    <ProgressRing value={profile.completeness} size={64} />
                    <div>
                      <p className="font-medium">{complete ? 'Profile complete' : 'Profile strength'}</p>
                      <p className="text-xs text-muted">{complete ? 'You are ready to apply.' : '100% is required to apply.'}</p>
                    </div>
                  </div>
                  <ul className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 text-[13px]">
                    {CHECKLIST.map((item) => {
                      const done = !profile.missing.includes(item);
                      return (
                        <li key={item} className={`flex items-center gap-1.5 ${done ? 'text-brown' : 'text-muted'}`}>
                          <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${done ? 'bg-success text-white' : 'border border-line-strong'}`}>
                            {done && <Icon name="check" className="h-3 w-3" strokeWidth={3} />}
                          </span>
                          <span className="sr-only">{done ? 'Done:' : 'Missing:'}</span>
                          {item}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </aside>

            {/* ---------------- Details form ---------------- */}
            <form onSubmit={onSave} noValidate className="animate-fade-up overflow-hidden rounded-3xl border border-line bg-white [animation-delay:80ms]">
              <Section title="Personal details" subtitle="Use your name exactly as it appears on your CNIC.">
                <Input label="Full name" name="full_name" autoComplete="name" value={form.full_name} onChange={onChange} error={errors.full_name} required className="md:col-span-2" />
                <div className="md:col-span-2">
                  <RadioGroup
                    label="Gender"
                    name="gender"
                    options={['Male', 'Female', 'Other']}
                    value={GENDER_TO_LABEL[form.gender] || ''}
                    onChange={(label) => set('gender', LABEL_TO_GENDER[label])}
                    error={errors.gender}
                    required
                  />
                </div>
              </Section>

              <Section title="Contact details" subtitle="We use these to reach you about your applications.">
                <Input label="Email" value={profile.email} disabled hint="Email cannot be changed." />
                <Input label="Phone number" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="03XXXXXXXXX" value={form.phone} onChange={onChange} error={errors.phone} required />
                <Input label="City" name="city" autoComplete="address-level2" placeholder="e.g. Karachi" value={form.city} onChange={onChange} error={errors.city} required />
                <Input label="Address" name="address" autoComplete="street-address" placeholder="House, street, area" value={form.address} onChange={onChange} error={errors.address} required />
              </Section>

              <Section title="Identity and education">
                <Input label="CNIC" value={profile.cnic || ''} disabled hint="CNIC cannot be changed." />
                <Select
                  label="Highest qualification"
                  name="highest_qualification"
                  placeholder="Select qualification"
                  options={qualificationOptions}
                  value={form.highest_qualification}
                  onChange={onChange}
                  error={errors.highest_qualification}
                  required
                />
              </Section>

              <div className="flex flex-wrap items-center justify-between gap-3 bg-paper px-6 py-5 sm:px-8">
                <p className="text-xs italic text-muted">Changes apply to new applications only.</p>
                <Button type="submit" loading={saving}>Save profile</Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
