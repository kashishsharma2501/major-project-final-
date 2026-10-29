import React from 'react';
import { PublicLayout } from '@/layouts/PublicLayout';

const sections = [
  {
    title: '1. What this application is',
    content: `SkillShare Local is an academic final-year project (B.Tech, Lovely Professional University). It is a hyperlocal skill-sharing platform that connects learners with local providers. While the platform uses real authentication and a real database, it is not a commercially deployed product. Use it for testing and demonstration purposes.`,
  },
  {
    title: '2. What data we collect',
    content: `When you create an account we collect your name, email address, city, and your chosen role (learner or provider). Your password is stored and managed securely by Supabase Auth — we never see or store your raw password. When you use the platform, we store bookings you create, reviews you submit, messages you send, skills providers list, and availability providers set. We do not collect payment information, phone numbers, government IDs, or sensitive personal data.`,
  },
  {
    title: '3. How we use your data',
    content: `Your profile information is used to display your name and city to other users within the platform. Booking records are used to track session history between learners and providers. Reviews are published publicly on provider profiles. Messages are stored so both conversation participants can read them. We do not sell your data, share it with third parties, or use it for advertising.`,
  },
  {
    title: '4. Who can see your data',
    content: `Your full profile (including bio and languages) is visible only to you and to admins. Other users see only your public name, city, role, and verification status through a deliberately narrow public view. Your booking history is visible only to the parties involved in each booking. Your messages are visible only to the participants in each conversation. Reviews you write are published publicly on the provider's profile.`,
  },
  {
    title: '5. Database security',
    content: `The database uses PostgreSQL Row Level Security (RLS) on every table. This means every query is checked at the database level against the authenticated user's identity — not just in application code. Users cannot read, write, or delete records that belong to other users. Admins have elevated read access for moderation purposes only. Role changes (e.g. promoting a user to admin) require direct database access and cannot be self-assigned.`,
  },
  {
    title: '6. Authentication',
    content: `Authentication is handled by Supabase Auth. Passwords are hashed using bcrypt and are never accessible in plaintext. Sessions are stored in localStorage and automatically refreshed. You can log out at any time to invalidate your session. Password reset is handled via a one-time email link that expires after one hour.`,
  },
  {
    title: '7. Cookies and local storage',
    content: `The application stores your authentication session token in localStorage. Your theme preference (light/dark) is also stored in localStorage. We do not use tracking cookies, analytics cookies, or advertising cookies.`,
  },
  {
    title: '8. Data retention',
    content: `Account data is retained as long as the project database is active. As this is an academic project, the database may be reset or decommissioned at the end of the project period. There is no formal data deletion request process for this academic project, but you may contact us at hello@skillsharelocal.in and we will manually remove your data on request.`,
  },
  {
    title: '9. Third-party services',
    content: `The platform uses Supabase (supabase.com) as the backend — your data is stored on Supabase-managed PostgreSQL infrastructure. No other third-party services that process personal data are used. Profile avatars are auto-generated using DiceBear (dicebear.com) — no personal data is sent to DiceBear, only a seed string.`,
  },
  {
    title: '10. Contact',
    content: `For any privacy-related questions, contact us at hello@skillsharelocal.in. As this is an academic project, responses are provided on a best-effort basis.`,
  },
];

export function PrivacyPage() {
  return (
    <PublicLayout>
      <section className="py-16 bg-white dark:bg-[#080E1A]">
        <div className="page-container max-w-3xl mx-auto">
          <div className="mb-10">
            <p className="section-label mb-2">Last updated: October 2026</p>
            <h1 className="text-4xl font-bold text-[#0B1220] dark:text-white mb-4 tracking-tight">Privacy Policy</h1>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
              This Privacy Policy describes how SkillShare Local collects, uses, and protects personal data. By using the platform, you agree to the practices described here.
            </p>
          </div>

          <div className="space-y-8">
            {sections.map(s => (
              <div key={s.title} className="card p-6">
                <h2 className="text-lg font-bold text-[#0F172A] dark:text-slate-100 mb-3">{s.title}</h2>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">{s.content}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 p-5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900">
            <p className="text-sm text-indigo-700 dark:text-indigo-300 font-semibold mb-1">Academic project notice</p>
            <p className="text-sm text-indigo-600 dark:text-indigo-400">
              SkillShare Local is a B.Tech final-year project. It is not a registered business or commercial service. This policy describes actual implemented behaviour, not a legal contract.
            </p>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
