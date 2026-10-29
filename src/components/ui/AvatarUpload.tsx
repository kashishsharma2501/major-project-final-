/**
 * AvatarUpload — reusable avatar upload widget.
 *
 * Shows the current avatar, lets the user pick a file, previews it,
 * uploads to Supabase Storage, saves the URL to profiles.avatar_url,
 * and syncs the in-memory AuthContext user.
 *
 * Validates: JPEG/PNG/WebP only, max 2 MB.
 */
import React, { useRef, useState } from 'react';
import { Camera, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/context/AuthContext';
import { uploadAvatar, removeAvatar, validateAvatarFile } from '@/services/storageService';
import { supabase } from '@/lib/supabase';
import { cn } from '@/utils/cn';

interface AvatarUploadProps {
  /** Called after a successful upload or removal with the new URL (null = removed) */
  onChanged?: (url: string | null) => void;
}

export function AvatarUpload({ onChanged }: AvatarUploadProps) {
  const { user, updateAvatar } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [preview, setPreview]   = useState<string | null>(null);  // local blob URL
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving]   = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [success, setSuccess]     = useState(false);

  const currentSrc = preview ?? user?.avatar;

  // ── File picker ─────────────────────────────────────────────────────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccess(false);

    // Client-side validation
    const validationError = validateAvatarFile(file);
    if (validationError) { setError(validationError); return; }

    // Show local preview immediately
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);

    if (!user?.id) { setError('Not authenticated.'); return; }
    setUploading(true);

    try {
      // Upload to Supabase Storage
      const { url, error: uploadError } = await uploadAvatar(user.id, file);
      if (uploadError || !url) throw new Error(uploadError ?? 'Upload failed');

      // Persist URL to profiles table
      const { error: dbError } = await supabase
        .from('profiles')
        .update({ avatar_url: url })
        .eq('id', user.id);
      if (dbError) throw new Error(dbError.message);

      // Sync in-memory user and notify parent
      updateAvatar(url);
      onChanged?.(url);
      setPreview(null);   // clear preview — the AuthContext user.avatar now has the real URL
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e: any) {
      setError(e.message ?? 'Upload failed. Please try again.');
      setPreview(null);
    } finally {
      setUploading(false);
      // Reset input so the same file can be picked again if needed
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ── Remove avatar ────────────────────────────────────────────────────────
  const handleRemove = async () => {
    if (!user?.id) return;
    setError(null);
    setSuccess(false);
    setRemoving(true);
    try {
      const { error: removeError } = await removeAvatar(user.id);
      if (removeError) throw new Error(removeError);
      updateAvatar(null);
      onChanged?.(null);
      setPreview(null);
    } catch (e: any) {
      setError(e.message ?? 'Could not remove avatar.');
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="flex items-start gap-5">
      {/* Avatar preview */}
      <div className="relative shrink-0 group">
        <Avatar src={currentSrc} name={user?.name ?? 'User'} size="xl" />

        {/* Camera overlay on hover */}
        {!uploading && !removing && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'absolute inset-0 rounded-full flex items-center justify-center',
              'bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200',
              'cursor-pointer'
            )}
            aria-label="Change profile photo"
          >
            <Camera className="w-5 h-5 text-white" />
          </button>
        )}

        {/* Spinner overlay during upload/remove */}
        {(uploading || removing) && (
          <div className="absolute inset-0 rounded-full flex items-center justify-center bg-black/40">
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#0F172A] dark:text-slate-100 mb-0.5">
          Profile photo
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
          JPEG, PNG or WebP · max 2 MB
        </p>

        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || removing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                       bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {uploading ? (
              <><Loader2 className="w-3 h-3 animate-spin" /> Uploading…</>
            ) : (
              <><Camera className="w-3 h-3" /> {currentSrc ? 'Change Photo' : 'Upload Photo'}</>
            )}
          </button>

          {(user?.avatar || preview) && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={uploading || removing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                         border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400
                         hover:bg-red-50 dark:hover:bg-red-950/30
                         disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {removing ? (
                <><Loader2 className="w-3 h-3 animate-spin" /> Removing…</>
              ) : (
                <><Trash2 className="w-3 h-3" /> Remove</>
              )}
            </button>
          )}
        </div>

        {/* Feedback messages */}
        {error && (
          <div className="flex items-center gap-1.5 mt-2 text-xs text-red-600 dark:text-red-400">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <p className="mt-2 text-xs text-green-600 dark:text-green-400 font-medium">
            ✓ Photo updated
          </p>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={handleFileChange}
        aria-label="Upload profile photo"
      />
    </div>
  );
}
