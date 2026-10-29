import React, { useState, useEffect } from 'react';
import { User, Lock, Bell, MapPin, Save, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { Tabs, TabList, Tab, TabPanel } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AvatarUpload } from '@/components/ui/AvatarUpload';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/utils/cn';

const indianCities = [
  'Ludhiana', 'Chandigarh', 'Amritsar', 'Jalandhar', 'Delhi',
  'Patiala', 'Mohali', 'Gurugram', 'Noida', 'Jaipur',
];

export function SettingsPage() {
  const { user, updateProfile, updatePassword } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  // ── Profile state ──────────────────────────────────────────────────────────
  const [profile, setProfile] = useState({
    name: user?.name || '',
    city: user?.city || 'Ludhiana',
    bio: user?.bio || '',
    languages: (user?.languages ?? []).join(', '),
  });
  const [profileSaving, setProfileSaving] = useState(false);

  // Keep form in sync if user loads after mount
  useEffect(() => {
    if (user) {
      setProfile({
        name: user.name,
        city: user.city,
        bio: user.bio || '',
        languages: (user.languages ?? []).join(', '),
      });
    }
  }, [user?.id]); // only re-sync on user change, not every render

  const saveProfile = async () => {
    if (!profile.name.trim()) { toast('warning', 'Name is required.'); return; }
    setProfileSaving(true);
    const langs = profile.languages
      .split(',')
      .map(l => l.trim())
      .filter(Boolean);
    const result = await updateProfile({
      name: profile.name.trim(),
      city: profile.city,
      bio: profile.bio.trim(),
      languages: langs,
    });
    setProfileSaving(false);
    if (result.error) {
      toast('error', result.message ?? 'Failed to save profile.');
    } else {
      toast('success', 'Profile updated');
    }
  };

  // ── Password state ─────────────────────────────────────────────────────────
  const [passwords, setPasswords] = useState({ newPass: '', confirm: '' });
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  const savePassword = async () => {
    if (!passwords.newPass) { toast('warning', 'Please enter a new password.'); return; }
    if (passwords.newPass.length < 8) { toast('error', 'Password must be at least 8 characters.'); return; }
    if (passwords.newPass !== passwords.confirm) { toast('error', 'Passwords do not match.'); return; }
    setPasswordSaving(true);
    const result = await updatePassword(passwords.newPass);
    setPasswordSaving(false);
    if (result.error) {
      toast('error', result.message ?? 'Failed to update password.');
    } else {
      toast('success', 'Password updated successfully');
      setPasswords({ newPass: '', confirm: '' });
    }
  };

  // ── Notification prefs (local only until notification settings table exists) ─
  const [notifPrefs, setNotifPrefs] = useState({
    bookingUpdates: true,
    messages: true,
    sessionReminders: true,
    reviews: true,
    marketing: false,
  });

  return (
    <DashboardLayout title="Settings">
      <div className="max-w-2xl">
        <Tabs defaultTab="profile">
          <TabList>
            <Tab value="profile">Profile</Tab>
            <Tab value="security">Security</Tab>
            <Tab value="notifications">Notifications</Tab>
            <Tab value="appearance">Appearance</Tab>
          </TabList>

          <div className="mt-6">

            {/* ── Profile tab ── */}
            <TabPanel value="profile">
              <div className="card p-6 space-y-6">
                {/* Avatar upload */}
                <AvatarUpload />

                <div className="border-t border-[#E2E8F0] dark:border-[#1E293B]" />

                <div className="grid sm:grid-cols-2 gap-4">
                  <Input
                    label="Full name"
                    value={profile.name}
                    onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
                    leftIcon={<User className="w-4 h-4" />}
                  />
                  <div>
                    <label className="block text-sm font-medium text-[#0F172A] dark:text-slate-200 mb-1.5">
                      Email address
                    </label>
                    <input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="input-base opacity-60 cursor-not-allowed"
                      title="Email cannot be changed here"
                    />
                    <p className="text-xs text-slate-400 mt-1">Managed by Supabase Auth</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#0F172A] dark:text-slate-200 mb-1.5">City</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <select
                      value={profile.city}
                      onChange={e => setProfile(p => ({ ...p, city: e.target.value }))}
                      className="input-base pl-10 appearance-none"
                    >
                      {indianCities.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#0F172A] dark:text-slate-200 mb-1.5">Bio</label>
                  <textarea
                    value={profile.bio}
                    onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))}
                    rows={3}
                    maxLength={400}
                    className="input-base resize-none"
                    placeholder="Tell learners or providers a bit about yourself."
                  />
                  <p className="text-xs text-slate-400 mt-1">{profile.bio.length}/400</p>
                </div>

                <Input
                  label="Languages"
                  value={profile.languages}
                  onChange={e => setProfile(p => ({ ...p, languages: e.target.value }))}
                  hint="Comma-separated — e.g. Hindi, Punjabi, English"
                />

                <div className="flex justify-end">
                  <Button
                    variant="primary"
                    leftIcon={<Save className="w-4 h-4" />}
                    onClick={saveProfile}
                    loading={profileSaving}
                  >
                    {!profileSaving && 'Save Changes'}
                  </Button>
                </div>
              </div>
            </TabPanel>

            {/* ── Security tab ── */}
            <TabPanel value="security">
              <div className="card p-6 space-y-5">
                <div>
                  <h3 className="text-base font-semibold text-[#0F172A] dark:text-slate-100 mb-1">Change Password</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
                    Use a strong password of at least 8 characters. You'll stay logged in after changing it.
                  </p>
                  <div className="space-y-4">
                    <Input
                      label="New password"
                      type={showNew ? 'text' : 'password'}
                      value={passwords.newPass}
                      onChange={e => setPasswords(p => ({ ...p, newPass: e.target.value }))}
                      leftIcon={<Lock className="w-4 h-4" />}
                      rightIcon={
                        <button type="button" onClick={() => setShowNew(v => !v)}
                          className="text-slate-400 hover:text-slate-600" aria-label="Toggle visibility">
                          {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      }
                      hint="Minimum 8 characters"
                    />
                    <Input
                      label="Confirm new password"
                      type={showConfirm ? 'text' : 'password'}
                      value={passwords.confirm}
                      onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))}
                      leftIcon={<Lock className="w-4 h-4" />}
                      rightIcon={
                        <button type="button" onClick={() => setShowConfirm(v => !v)}
                          className="text-slate-400 hover:text-slate-600" aria-label="Toggle visibility">
                          {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      }
                      error={
                        passwords.confirm && passwords.newPass !== passwords.confirm
                          ? 'Passwords do not match'
                          : undefined
                      }
                    />
                  </div>
                  <div className="flex justify-end mt-4">
                    <Button variant="primary" onClick={savePassword} loading={passwordSaving}>
                      {!passwordSaving && 'Update Password'}
                    </Button>
                  </div>
                </div>

                <div className="border-t border-[#E2E8F0] dark:border-[#1E293B]" />

                <div>
                  <h3 className="text-base font-semibold text-[#0F172A] dark:text-slate-100 mb-4">Account</h3>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-[#E2E8F0] dark:border-[#1E293B]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-950/30 flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#0F172A] dark:text-slate-100">{user?.email}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{user?.role} account · Authenticated</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabPanel>

            {/* ── Notifications tab ── */}
            <TabPanel value="notifications">
              <div className="card p-6">
                <h3 className="text-base font-semibold text-[#0F172A] dark:text-slate-100 mb-1">In-App Notifications</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
                  Control which notifications appear in your notifications feed.
                </p>
                <div className="space-y-4">
                  {(Object.entries(notifPrefs) as [keyof typeof notifPrefs, boolean][]).map(([key, val]) => {
                    const labels: Record<string, { title: string; desc: string }> = {
                      bookingUpdates: { title: 'Booking updates', desc: 'Confirmations, declines, and cancellations' },
                      messages: { title: 'New messages', desc: 'When you receive a message' },
                      sessionReminders: { title: 'Session reminders', desc: '24 hours before an upcoming session' },
                      reviews: { title: 'Reviews', desc: 'When someone leaves you a review' },
                      marketing: { title: 'Tips & announcements', desc: 'Platform updates and community news' },
                    };
                    const label = labels[key];
                    return (
                      <div key={key} className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium text-[#0F172A] dark:text-slate-100">{label.title}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{label.desc}</p>
                        </div>
                        <button
                          role="switch"
                          aria-checked={val}
                          onClick={() => setNotifPrefs(p => ({ ...p, [key]: !p[key] }))}
                          className={cn(
                            'relative shrink-0 w-10 h-5 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/30',
                            val ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'
                          )}
                        >
                          <span className={cn(
                            'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
                            val && 'translate-x-5'
                          )} />
                        </button>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-slate-400 mt-6">
                  Notification preference persistence will be added in a future update.
                </p>
              </div>
            </TabPanel>

            {/* ── Appearance tab ── */}
            <TabPanel value="appearance">
              <div className="card p-6">
                <h3 className="text-base font-semibold text-[#0F172A] dark:text-slate-100 mb-1">Theme</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
                  Choose how SkillShare Local looks for you.
                </p>
                <div className="grid grid-cols-2 gap-3 max-w-xs">
                  {([
                    { value: 'light', label: 'Light', preview: 'bg-white border-slate-200' },
                    { value: 'dark', label: 'Dark', preview: 'bg-slate-900 border-slate-700' },
                  ] as const).map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setTheme(opt.value)}
                      className={cn(
                        'p-4 rounded-xl border-2 text-center transition-all',
                        theme === opt.value
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/30'
                          : 'border-[#E2E8F0] dark:border-[#1E293B] hover:border-slate-300'
                      )}
                    >
                      <div className={cn('w-full h-12 rounded-lg border mb-2', opt.preview)} />
                      <p className={cn(
                        'text-sm font-medium',
                        theme === opt.value
                          ? 'text-indigo-700 dark:text-indigo-300'
                          : 'text-[#0F172A] dark:text-slate-100'
                      )}>
                        {opt.label}
                      </p>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-4">Theme preference is saved to your browser.</p>
              </div>
            </TabPanel>

          </div>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
