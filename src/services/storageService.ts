/**
 * Storage service — Supabase Storage for avatar uploads.
 *
 * Bucket: 'avatars' (public read, authenticated write to own path)
 * Path convention: avatars/{user_id}/avatar.{ext}
 *   - One file per user; uploading replaces the previous version.
 *   - User can only write/delete their own path (enforced by Storage RLS).
 *
 * Validation:
 *   - Max file size: 2 MB
 *   - Accepted types: image/jpeg, image/png, image/webp
 *   - Minimum dimensions are not enforced client-side (server handles it).
 */

import { supabase } from '@/lib/supabase';

const BUCKET = 'avatars';
const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export interface UploadAvatarResult {
  url: string | null;
  error: string | null;
}

export function validateAvatarFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return 'File must be a JPEG, PNG, or WebP image.';
  }
  if (file.size > MAX_SIZE_BYTES) {
    return `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum size is 2 MB.`;
  }
  return null;
}

/** Upload a new avatar for the given user. Returns the public URL on success. */
export async function uploadAvatar(userId: string, file: File): Promise<UploadAvatarResult> {
  const validationError = validateAvatarFile(file);
  if (validationError) return { url: null, error: validationError };

  const ext = file.type === 'image/webp' ? 'webp' : file.type === 'image/png' ? 'png' : 'jpg';
  const path = `${userId}/avatar.${ext}`;

  // Remove old file first (any extension) — ignore errors if it doesn't exist
  await Promise.allSettled([
    supabase.storage.from(BUCKET).remove([`${userId}/avatar.jpg`]),
    supabase.storage.from(BUCKET).remove([`${userId}/avatar.png`]),
    supabase.storage.from(BUCKET).remove([`${userId}/avatar.webp`]),
  ]);

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      upsert: true,
      contentType: file.type,
      cacheControl: '3600',
    });

  if (uploadError) return { url: null, error: uploadError.message };

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
  // Append cache-buster so the browser always fetches the new image
  const url = `${urlData.publicUrl}?t=${Date.now()}`;
  return { url, error: null };
}

/** Remove a user's avatar from Storage and clear avatar_url in their profile. */
export async function removeAvatar(userId: string): Promise<{ error: string | null }> {
  await Promise.allSettled([
    supabase.storage.from(BUCKET).remove([`${userId}/avatar.jpg`]),
    supabase.storage.from(BUCKET).remove([`${userId}/avatar.png`]),
    supabase.storage.from(BUCKET).remove([`${userId}/avatar.webp`]),
  ]);

  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: null })
    .eq('id', userId);

  return { error: error?.message ?? null };
}
