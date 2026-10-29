import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, BookOpen, RefreshCw } from 'lucide-react';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency, formatDuration, capitalise } from '@/utils/format';
import {
  getOrCreateProviderProfile,
  getProviderSkills,
  createProviderSkill,
  updateProviderSkill,
  deleteProviderSkill,
  type DbProviderSkill,
  type SkillInput,
} from '@/services/providerSkillsService';
import { getCatalogueSkills, getCatalogueCategories, getCatalogueLoadStatus } from '@/services/catalogueService';

type FormState = Partial<SkillInput>;

const BLANK_FORM: FormState = {
  skill_name: '',
  category: '',
  experience_level: 'intermediate',
  years_of_experience: 1,
  price_per_session: undefined,
  session_duration_mins: 60,
  learning_mode: 'either',
  description: '',
};

export function ProviderSkillsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [providerId, setProviderId] = useState<string | null>(null);
  const [skills, setSkills] = useState<DbProviderSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [editing, setEditing] = useState<DbProviderSkill | null>(null);
  const [form, setForm] = useState<FormState>(BLANK_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Catalogue suggestions for skill name + category fields
  const [catalogueNames, setCatalogueNames] = useState<string[]>([]);
  const [catalogueCategories, setCatalogueCategories] = useState<string[]>([]);
  const [catalogueFallback, setCatalogueFallback] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getCatalogueSkills(), getCatalogueCategories()]).then(([skills, cats]) => {
      if (cancelled) return;
      setCatalogueNames(skills.map(s => s.name).sort());
      setCatalogueCategories(cats.map(c => c.name).sort());
      setCatalogueFallback(getCatalogueLoadStatus().source === 'fallback');
    });
    return () => { cancelled = true; };
  }, []);

  // ── Load provider profile + skills ──────────────────────────────────────
  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const pid = await getOrCreateProviderProfile(user.id, user.city);
      if (!pid) throw new Error('Could not initialise provider profile.');
      setProviderId(pid);
      const data = await getProviderSkills(pid);
      setSkills(data);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load skills.');
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.city]);

  useEffect(() => { load(); }, [load]);

  // ── Modal helpers ────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditing(null);
    setForm(BLANK_FORM);
    setModalOpen(true);
  };

  const openEdit = (s: DbProviderSkill) => {
    setEditing(s);
    setForm({
      skill_name: s.skill_name,
      category: s.category,
      experience_level: s.experience_level,
      years_of_experience: s.years_of_experience,
      price_per_session: s.price_per_session,
      session_duration_mins: s.session_duration_mins,
      learning_mode: s.learning_mode,
      description: s.description,
    });
    setModalOpen(true);
  };

  // ── Save (create or update) ──────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.skill_name?.trim()) { toast('warning', 'Skill name is required.'); return; }
    if (!form.price_per_session || form.price_per_session <= 0) {
      toast('warning', 'Please enter a valid price.'); return;
    }
    if (!providerId) return;

    setSaving(true);
    try {
      const input: SkillInput = {
        skill_name: form.skill_name.trim(),
        category: form.category?.trim() || 'Other',
        experience_level: form.experience_level || 'intermediate',
        years_of_experience: form.years_of_experience || 1,
        price_per_session: form.price_per_session,
        session_duration_mins: form.session_duration_mins || 60,
        learning_mode: form.learning_mode || 'either',
        description: form.description?.trim() || '',
      };

      if (editing) {
        const updated = await updateProviderSkill(editing.id, input);
        setSkills(prev => prev.map(s => s.id === editing.id ? updated : s));
        toast(
          updated.approval_status === 'pending' ? 'info' : 'success',
          updated.approval_status === 'pending' ? 'Skill submitted for review' : 'Skill updated',
          updated.approval_status === 'pending'
            ? 'This skill is hidden from learners until an admin approves it.'
            : undefined,
        );
      } else {
        const created = await createProviderSkill(providerId, input);
        setSkills(prev => [...prev, created]);
        toast('success', 'Skill submitted for review', 'It will appear to learners after an admin approves it.');
      }
      setModalOpen(false);
    } catch (e: any) {
      toast('error', 'Failed to save skill', e.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteProviderSkill(deleteTarget);
      setSkills(prev => prev.filter(s => s.id !== deleteTarget));
      toast('info', 'Skill removed');
    } catch (e: any) {
      toast('error', 'Failed to remove skill', e.message);
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <DashboardLayout title="My Skills" subtitle="Manage the skills you offer to learners">
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="My Skills" subtitle="Manage the skills you offer to learners">
        <EmptyState
          icon={<RefreshCw className="w-6 h-6" />}
          title="Could not load skills"
          description={error}
          action={{ label: 'Try Again', onClick: load }}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="My Skills"
      subtitle="Manage the skills you offer to learners"
      actions={
        <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={openAdd}>
          Add Skill
        </Button>
      }
    >
      {skills.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="w-6 h-6" />}
          title="No skills added yet"
          description="Submit a skill session for admin review. Approved sessions become visible and bookable."
          action={{ label: 'Add Your First Skill', onClick: openAdd }}
        />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {skills.map(skill => (
            <div key={skill.id} className="card p-5 flex flex-col">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <h3 className="font-semibold text-[#0F172A] dark:text-slate-100 truncate">{skill.skill_name}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{skill.category}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant={
                      skill.approval_status === 'approved' ? 'success'
                        : skill.approval_status === 'rejected' ? 'danger' : 'warning'
                    }>
                      {skill.approval_status}
                    </Badge>
                    {!skill.is_active && <Badge variant="slate">Inactive</Badge>}
                  </div>
                </div>
                <p className="text-lg font-bold text-[#0F172A] dark:text-slate-100 shrink-0">
                  {formatCurrency(skill.price_per_session)}
                </p>
              </div>

              {skill.rejection_reason && (
                <p className="text-xs text-red-600 dark:text-red-400 mb-3">
                  Rejection reason: {skill.rejection_reason}
                </p>
              )}

              <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 line-clamp-2 flex-1">
                {skill.description || 'No description added.'}
              </p>

              <div className="flex flex-wrap gap-1.5 mb-4">
                <Badge variant="indigo">{capitalise(skill.experience_level)}</Badge>
                <Badge variant="teal">{skill.years_of_experience}y exp</Badge>
                <Badge variant="default">{formatDuration(skill.session_duration_mins)}</Badge>
                <Badge variant="slate">
                  {skill.learning_mode === 'either' ? 'Online/Offline' : capitalise(skill.learning_mode)}
                </Badge>
              </div>

              <div className="flex gap-2 pt-3 border-t border-[#E2E8F0] dark:border-[#1E293B]">
                <Button size="xs" variant="secondary" leftIcon={<Edit2 className="w-3 h-3" />} onClick={() => openEdit(skill)}>
                  Edit
                </Button>
                <Button size="xs" variant="danger" leftIcon={<Trash2 className="w-3 h-3" />} onClick={() => setDeleteTarget(skill.id)}>
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add / Edit modal ── */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Skill' : 'Add a New Skill'}
        size="md"
      >
        <div className="space-y-4">
          {catalogueFallback && (
            <p className="text-xs text-amber-700 dark:text-amber-300" role="status">
              Skill suggestions are using the bundled catalogue because the database is unavailable.
            </p>
          )}
          {/* Datalists for catalogue suggestions */}
          <datalist id="catalogue-skill-names">
            {catalogueNames.map(n => <option key={n} value={n} />)}
          </datalist>
          <datalist id="catalogue-categories">
            {catalogueCategories.map(c => <option key={c} value={c} />)}
          </datalist>

          <Input
            label="Skill name *"
            value={form.skill_name || ''}
            onChange={e => setForm(f => ({ ...f, skill_name: e.target.value }))}
            placeholder="e.g. Photography"
            list="catalogue-skill-names"
            hint="Choose from the verified catalogue or type your own"
          />
          <Input
            label="Category"
            value={form.category || ''}
            onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            placeholder="e.g. Creative Arts"
            list="catalogue-categories"
          />
          <Textarea
            label="Description"
            value={form.description || ''}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="What will students learn? What level should they be?"
            rows={3}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Price per session (₹) *"
              type="number"
              min={1}
              value={form.price_per_session || ''}
              onChange={e => setForm(f => ({ ...f, price_per_session: Number(e.target.value) }))}
              placeholder="500"
            />
            <Input
              label="Duration (minutes)"
              type="number"
              min={15}
              value={form.session_duration_mins || ''}
              onChange={e => setForm(f => ({ ...f, session_duration_mins: Number(e.target.value) }))}
              placeholder="60"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Years of experience"
              type="number"
              min={0}
              max={50}
              value={form.years_of_experience || ''}
              onChange={e => setForm(f => ({ ...f, years_of_experience: Number(e.target.value) }))}
              placeholder="3"
            />
            <Select
              label="Experience level"
              value={form.experience_level || 'intermediate'}
              onChange={e => setForm(f => ({ ...f, experience_level: e.target.value as SkillInput['experience_level'] }))}
              options={[
                { value: 'beginner', label: 'Beginner' },
                { value: 'intermediate', label: 'Intermediate' },
                { value: 'advanced', label: 'Advanced' },
              ]}
            />
          </div>
          <Select
            label="Learning mode"
            value={form.learning_mode || 'either'}
            onChange={e => setForm(f => ({ ...f, learning_mode: e.target.value as SkillInput['learning_mode'] }))}
            options={[
              { value: 'offline', label: 'Offline (in person)' },
              { value: 'online', label: 'Online (video call)' },
              { value: 'either', label: 'Either' },
            ]}
          />
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} loading={saving}>
              {!saving && (editing ? 'Save Changes' : 'Add Skill')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Delete confirm ── */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Remove skill?"
        description="This skill will no longer appear on your profile. Existing bookings won't be affected."
        confirmLabel={deleting ? 'Removing…' : 'Remove'}
        confirmVariant="danger"
      />
    </DashboardLayout>
  );
}
