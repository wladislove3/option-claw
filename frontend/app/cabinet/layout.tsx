'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Briefcase, Bell, User, ArrowLeftToLine } from 'lucide-react';

interface CabinetLayoutProps {
  children: React.ReactNode;
}

export default function CabinetLayout({ children }: CabinetLayoutProps) {
  const pathname = usePathname();
  
  const navItems = [
    { href: '/cabinet', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/cabinet/positions', label: 'Positions', icon: Briefcase },
    { href: '/cabinet/alerts', label: 'Alerts', icon: Bell },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-300 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[#131722] border-r border-[#2a2e39] flex flex-col">
        {/* Brand */}
        <div className="p-6 border-b border-[#2a2e39]">
          <h1 className="text-xl font-black text-white tracking-tighter uppercase italic">
            Option<span className="text-blue-500">Strategist</span>
          </h1>
        </div>

        {/* Back to Calculator */}
        <div className="p-4 border-b border-[#2a2e39]">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2 bg-[#0a0a0a] border border-[#2a2e39] rounded-lg text-sm text-zinc-400 hover:text-white hover:border-blue-500 transition-all"
          >
            <ArrowLeftToLine className="w-4 h-4" />
            Back to Calculator
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-zinc-400 hover:bg-[#2a2e39] hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-[#2a2e39]">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-[#0a0a0a]">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
              JD
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">John Doe</div>
              <div className="text-xs text-zinc-500 truncate">Trader</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
