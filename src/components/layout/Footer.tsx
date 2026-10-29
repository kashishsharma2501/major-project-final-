import React from 'react';
import { Link } from 'react-router-dom';
import { Logo } from './Logo';
import { MapPin, Mail } from 'lucide-react';

const footerLinks = {
  Platform: [
    { label: 'Explore Skills', href: '/explore' },
    { label: 'How It Works', href: '/how-it-works' },
    { label: 'Become a Provider', href: '/become-a-provider' },
    { label: 'Find Providers', href: '/explore' },
  ],
  Categories: [
    { label: 'Creative Arts', href: '/explore?category=Creative+Arts' },
    { label: 'Technology', href: '/explore?category=Technology' },
    { label: 'Music', href: '/explore?category=Music' },
    { label: 'Health & Wellness', href: '/explore?category=Health+%26+Wellness' },
  ],
  Company: [
    { label: 'About', href: '/about' },
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Use', href: '/terms' },
    { label: 'Contact', href: '/contact' },
  ],
};

export function Footer() {
  return (
    <footer className="mt-auto" style={{ background: 'linear-gradient(160deg, #0f0a2e 0%, #0B1220 50%, #071a14 100%)' }}>
      <div className="page-container py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Logo light size="md" className="mb-4" />
            <p className="text-sm text-slate-400 leading-relaxed max-w-xs mb-5">
              Connecting learners with skilled local people for meaningful, in-person and online learning experiences.
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                <span>Ludhiana, Punjab · India</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Mail className="w-3.5 h-3.5 text-indigo-400" />
                <span>hello@skillsharelocal.in</span>
              </div>
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-4">{category}</h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.href}
                      className="text-sm text-slate-500 hover:text-slate-200 transition-colors duration-150"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-600">
            © 2026 SkillShare Local · B.Tech Final Year Project · Lovely Professional University
          </p>
          <p className="text-xs text-slate-600">
            React · TypeScript · Tailwind CSS · Supabase
          </p>
        </div>
      </div>
    </footer>
  );
}
