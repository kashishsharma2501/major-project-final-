import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit2, MapPin, Globe, Calendar, Star, BookOpen, Award } from 'lucide-react';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { AvatarUpload } from '@/components/ui/AvatarUpload';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input, Textarea } from '@/components/ui/Input';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { getReviewsByLearner } from '@/services/reviewService';
import { getBookingsByLearner } from '@/services/bookingService';
import { getCatalogueSkills } from '@/services/catalogueService';
import type { Booking, Review } from '@/types';
import { formatDate } from '@/utils/format';

export function LearnerProfilePage() {
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [myReviews, setMyReviews] = useState<Review[]>([]);
  const [skillOptions, setSkillOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const completedSessions = myBookings.filter((b) => b.status === 'completed').length;

  const [editOpen, setEditOpen] = useState(false);
  const [profile, setProfile] = useState({
    name: user?.name || '',
    bio: user?.bio || '',
    city: user?.city || 'Ludhiana',
    languages: user?.languages ?? [],
    interestedSkills: [] as string[],
  });
  const [editForm, setEditForm] = useState(profile);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const [bookings, reviews, catalogue] = await Promise.all([
        getBookingsByLearner(user.id),
        getReviewsByLearner(user.id),
        getCatalogueSkills(),
      ]);
      setMyBookings(bookings);
      setMyReviews(reviews);
      setSkillOptions(catalogue.map(skill => skill.name));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load profile activity.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!user) return;
    setProfile(current => ({
      ...current,
      name: user.name,
      bio: user.bio ?? '',
      city: user.city,
      languages: user.languages ?? [],
    }));
  }, [user?.id, user?.name, user?.bio, user?.city, user?.languages]);

  const saveProfile = async () => {
    const result = await updateProfile({
      name: editForm.name.trim(),
      bio: editForm.bio.trim(),
      city: editForm.city.trim(),
      languages: editForm.languages,
    });
    if (result.error) {
      toast('error', result.message ?? 'Could not update profile.');
      return;
    }
    setProfile(editForm);
    setEditOpen(false);
    toast('success', 'Profile updated');
  };

  const toggleSkill = (skill: string) => {
    setEditForm((f) => ({
      ...f,
      interestedSkills: f.interestedSkills.includes(skill)
        ? f.interestedSkills.filter((s) => s !== skill)
        : f.interestedSkills.length < 8 ? [...f.interestedSkills, skill] : f.interestedSkills,
    }));
  };

  return (
    <DashboardLayout title="My Profile">
      <div className="max-w-3xl space-y-6">
        {loading && <p className="text-sm text-slate-400" role="status">Loading profile activity…</p>}
        {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
        {/* Profile card */}
        <div className="card p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-4">
              <Avatar src={user?.avatar} name={user?.name || 'User'} size="xl" />
              <div>
                <h2 className="text-xl font-bold text-[#0F172A] dark:text-slate-100">{profile.name}</h2>
                <div className="flex items-center gap-3 mt-1 text-sm text-slate-500 dark:text-slate-400 flex-wrap">
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{profile.city}</span>
                  <span className="flex items-center gap-1"><Globe className="w-3.5 h-3.5" />{profile.languages.join(', ')}</span>
                  <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />Learner account</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="indigo">Learner</Badge>
                </div>
              </div>
            </div>
            <Button variant="secondary" size="sm" leftIcon={<Edit2 className="w-3.5 h-3.5" />} onClick={() => { setEditForm(profile); setEditOpen(true); }}>
              Edit Profile
            </Button>
          </div>

          {profile.bio && (
            <p className="mt-4 text-sm text-slate-600 dark:text-slate-400 leading-relaxed border-t border-[#E2E8F0] dark:border-[#1E293B] pt-4">
              {profile.bio}
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: <BookOpen className="w-5 h-5 text-indigo-500" />, value: myBookings.length, label: 'Total Bookings' },
            { icon: <Star className="w-5 h-5 text-amber-500" />, value: completedSessions, label: 'Completed Sessions' },
            { icon: <Award className="w-5 h-5 text-teal-500" />, value: myReviews.length, label: 'Reviews Written' },
          ].map((s) => (
            <div key={s.label} className="card p-4 text-center">
              <div className="flex justify-center mb-2">{s.icon}</div>
              <p className="text-2xl font-bold text-[#0F172A] dark:text-slate-100">{s.value}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Skills of interest */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#0F172A] dark:text-slate-100">Skills I'm Learning</h3>
            <button onClick={() => { setEditForm(profile); setEditOpen(true); }}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">Edit</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {profile.interestedSkills.map((s) => (
              <Badge key={s} variant="indigo">{s}</Badge>
            ))}
          </div>
          {profile.interestedSkills.length === 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-400">No skills added yet.</p>
          )}
        </div>

        {/* Recent bookings */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#0F172A] dark:text-slate-100">Recent Sessions</h3>
            <button onClick={() => navigate('/dashboard/bookings')} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">View all</button>
          </div>
          {myBookings.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No sessions yet. <button onClick={() => navigate('/explore')} className="text-indigo-600 dark:text-indigo-400 hover:underline">Explore skills</button></p>
          ) : (
            <div className="space-y-3">
              {myBookings.slice(0, 3).map((b) => (
                <div key={b.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium text-[#0F172A] dark:text-slate-100">{b.skill}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">with {b.providerName} · {formatDate(b.date)}</p>
                  </div>
                  <Badge variant={b.status === 'completed' ? 'teal' : b.status === 'accepted' ? 'success' : b.status === 'pending' ? 'warning' : 'danger'}>
                    {b.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit profile modal */}
      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Edit Profile" size="md">
        <div className="space-y-4">
          {/* Avatar upload inside edit modal */}
          <div className="pb-3 border-b border-[#E2E8F0] dark:border-[#1E293B]">
            <AvatarUpload />
          </div>
          <Input label="Full name" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
          <Textarea label="Bio" value={editForm.bio} onChange={(e) => setEditForm((f) => ({ ...f, bio: e.target.value }))}
            placeholder="Tell providers a bit about yourself and what you want to learn." rows={3} />
          <Input label="City" value={editForm.city} onChange={(e) => setEditForm((f) => ({ ...f, city: e.target.value }))} />
          <Input label="Languages (comma-separated)" value={editForm.languages.join(', ')}
            onChange={(e) => setEditForm((f) => ({ ...f, languages: e.target.value.split(',').map((l) => l.trim()).filter(Boolean) }))} />

          <div>
            <p className="text-sm font-medium text-[#0F172A] dark:text-slate-200 mb-2">Skills I'm interested in</p>
            <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto">
              {skillOptions.map((s) => (
                <button key={s} type="button" onClick={() => toggleSkill(s)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                    editForm.interestedSkills.includes(s)
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'border-[#E2E8F0] dark:border-[#1E293B] text-slate-600 dark:text-slate-400 hover:border-indigo-300'
                  }`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-1">
            <Button variant="secondary" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={saveProfile}>Save Changes</Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
