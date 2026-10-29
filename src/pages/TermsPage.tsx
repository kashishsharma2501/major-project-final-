import React from 'react';
import { PublicLayout } from '@/layouts/PublicLayout';

const sections = [
  {
    title: '1. Acceptance of terms',
    content: `By creating an account or using SkillShare Local you agree to these Terms. If you do not agree, do not use the platform. SkillShare Local is an academic final-year project (B.Tech, Lovely Professional University) and is not a commercial service.`,
  },
  {
    title: '2. Eligibility',
    content: `You must be at least 18 years old to use SkillShare Local. By registering, you confirm that you are 18 or older and that the information you provide is accurate. You are responsible for maintaining the confidentiality of your account credentials.`,
  },
  {
    title: '3. Accounts',
    content: `You may create one account per email address. You are responsible for all activity that occurs under your account. Do not share your login credentials. We reserve the right to suspend or terminate accounts that violate these Terms or that are used for fraudulent or abusive purposes.`,
  },
  {
    title: '4. Providers',
    content: `Providers are users who list skills and accept booking requests. By listing a skill, you confirm that you have genuine knowledge or experience in that skill. You are responsible for the accuracy of your profile, skills, pricing, and availability. You must honour confirmed bookings or cancel them promptly. SkillShare Local does not verify credentials or qualifications — learners rely on your profile information and reviews.`,
  },
  {
    title: '5. Learners',
    content: `Learners are users who search for and book skills. You are responsible for attending booked sessions or cancelling in advance. Reviews you submit must be honest and based on your genuine experience. Do not submit false or defamatory reviews. You confirm completion of a session by pressing the "Mark Complete" button after the session has taken place.`,
  },
  {
    title: '6. Bookings and payments',
    content: `Bookings are requests made by learners and confirmed by providers. A booking is confirmed only when the provider accepts it. Prices are set by providers. The current version of SkillShare Local does not process payments — any financial arrangements are made directly between learner and provider. The platform records booking prices for earnings tracking purposes only.`,
  },
  {
    title: '7. Reviews',
    content: `Reviews can only be submitted by learners after a booking has been marked complete by both parties. One review is permitted per booking. Reviews are published publicly on the provider's profile. SkillShare Local may remove reviews that are abusive, fraudulent, or that violate these Terms, but does not edit review content.`,
  },
  {
    title: '8. Prohibited conduct',
    content: `You must not: use the platform for illegal activity; harass, threaten, or abuse other users; submit false or misleading information; attempt to gain unauthorised access to any account or database; use the platform to spam or solicit users outside it; attempt to self-assign the admin role or exploit security weaknesses; scrape, copy, or redistribute platform content without permission.`,
  },
  {
    title: '9. Intellectual property',
    content: `The SkillShare Local codebase, design, and verified skill catalogue are the work of the project authors. The skill catalogue is backed by publicly available market research — source URLs are documented in the platform. User-generated content (profiles, reviews, messages) remains the property of the users who created it.`,
  },
  {
    title: '10. Limitation of liability',
    content: `SkillShare Local is provided as-is for academic purposes. We make no guarantees about uptime, data retention, or the quality of sessions arranged through the platform. We are not liable for disputes between learners and providers, lost data, or indirect damages arising from use of the platform.`,
  },
  {
    title: '11. Changes to terms',
    content: `These Terms may be updated as the project develops. Continued use of the platform after changes are posted constitutes acceptance of the revised Terms. We will note the last-updated date at the top of this page.`,
  },
  {
    title: '12. Contact',
    content: `Questions about these Terms? Contact us at hello@skillsharelocal.in.`,
  },
];

export function TermsPage() {
  return (
    <PublicLayout>
      <section className="py-16 bg-white dark:bg-[#080E1A]">
        <div className="page-container max-w-3xl mx-auto">
          <div className="mb-10">
            <p className="section-label mb-2">Last updated: October 2026</p>
            <h1 className="text-4xl font-bold text-[#0B1220] dark:text-white mb-4 tracking-tight">Terms of Use</h1>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
              These Terms of Use govern your access to and use of SkillShare Local. Please read them carefully before creating an account.
            </p>
          </div>

          <div className="space-y-6">
            {sections.map(s => (
              <div key={s.title} className="card p-6">
                <h2 className="text-base font-bold text-[#0F172A] dark:text-slate-100 mb-3">{s.title}</h2>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">{s.content}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900">
            <p className="text-sm text-amber-700 dark:text-amber-300 font-semibold mb-1">Academic project</p>
            <p className="text-sm text-amber-600 dark:text-amber-400">
              SkillShare Local is a B.Tech final-year project, not a registered business or commercial service. These terms describe actual implemented behaviour.
            </p>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
