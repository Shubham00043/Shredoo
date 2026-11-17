'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useUser, UserButton } from '@clerk/nextjs';
import { loungeClerkTheme } from '@/lib/clerk-theme';
import {
  ShieldAlert,
  Users,
  Radio,
  FileText,
  KeyRound,
  Music2,
  BarChart3,
  History,
  Settings,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Trash2,
  Ban,
  UserCheck,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Shield,
  Volume2,
  Mic,
  Disc,
  ArrowLeft,
  Sliders,
  Check,
  X,
  Lock,
} from 'lucide-react';

type AdminTab =
  | 'overview'
  | 'users'
  | 'rooms'
  | 'reports'
  | 'roles'
  | 'providers'
  | 'analytics'
  | 'audit'
  | 'settings';

export default function AdminPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Platform Data
  const [overviewData, setOverviewData] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [roomsList, setRoomsList] = useState<any[]>([]);
  const [reportsList, setReportsList] = useState<any[]>([]);
  const [rolesList, setRolesList] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [platformSettings, setPlatformSettings] = useState<any>(null);

  // Filter & Search states
  const [userSearch, setUserSearch] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('all');
  const [roomSearch, setRoomSearch] = useState('');
  const [roomStatusFilter, setRoomStatusFilter] = useState('all');
  const [reportFilter, setReportFilter] = useState('all');

  // Action Modals State
  const [actionModal, setActionModal] = useState<{
    type: 'block' | 'suspend' | 'delete_user' | 'close_room' | 'delete_room' | 'promote_mod';
    target: any;
  } | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [suspendDays, setSuspendDays] = useState('7');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([
    'users.read',
    'users.suspend',
    'users.block',
    'rooms.read',
    'rooms.close',
    'reports.manage',
  ]);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Fetch Overview and check admin permissions
  const fetchOverview = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/overview');
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to authenticate admin session');
      }
      setOverviewData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const q = encodeURIComponent(userSearch);
      const res = await fetch(`/api/admin/users?q=${q}&status=${userStatusFilter}`);
      const data = await res.json();
      if (res.ok) setUsersList(data.users || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRooms = async () => {
    try {
      const q = encodeURIComponent(roomSearch);
      const res = await fetch(`/api/admin/rooms?q=${q}&status=${roomStatusFilter}`);
      const data = await res.json();
      if (res.ok) setRoomsList(data.rooms || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchReports = async () => {
    try {
      const res = await fetch(`/api/admin/reports?status=${reportFilter}`);
      const data = await res.json();
      if (res.ok) setReportsList(data.reports || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await fetch('/api/admin/roles');
      const data = await res.json();
      if (res.ok) setRolesList(data.roles || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch('/api/admin/audit-logs');
      const data = await res.json();
      if (res.ok) setAuditLogs(data.logs || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings');
      const data = await res.json();
      if (res.ok) setPlatformSettings(data.settings);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (isSignedIn) {
      fetchOverview();
    }
  }, [isSignedIn]);

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
    else if (activeTab === 'rooms') fetchRooms();
    else if (activeTab === 'reports') fetchReports();
    else if (activeTab === 'roles') fetchRoles();
    else if (activeTab === 'audit') fetchAuditLogs();
    else if (activeTab === 'settings') fetchSettings();
  }, [activeTab, userStatusFilter, roomStatusFilter, reportFilter]);

  // Handle User Restrictions (Block, Suspend, Ban, Restore)
  const handleUserRestriction = async (
    targetUserId: string,
    action: 'restrict' | 'restore',
    type?: 'blocked' | 'suspended' | 'banned'
  ) => {
    try {
      setActionLoading(true);
      const res = await fetch(`/api/admin/users/${targetUserId}/restrict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          type,
          reason: actionReason || 'Moderation action taken by admin',
          durationDays: suspendDays,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setActionSuccess(data.message);
      setActionModal(null);
      setActionReason('');
      fetchUsers();
      fetchOverview();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Delete User
  const handleDeleteUser = async (targetUserId: string) => {
    try {
      setActionLoading(true);
      const res = await fetch(
        `/api/admin/users/${targetUserId}?reason=${encodeURIComponent(actionReason)}`,
        { method: 'DELETE' }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setActionSuccess(data.message);
      setActionModal(null);
      setActionReason('');
      fetchUsers();
      fetchOverview();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Room Actions (Close, Reopen, Delete, Revoke Code)
  const handleRoomAction = async (roomId: string, action: string, extra?: any) => {
    try {
      setActionLoading(true);
      const res = await fetch(`/api/admin/rooms/${roomId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          reason: actionReason || `Admin action: ${action}`,
          ...extra,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setActionSuccess(data.message);
      setActionModal(null);
      setActionReason('');
      fetchRooms();
      fetchOverview();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Report Status Update
  const handleReportStatus = async (reportId: string, status: string) => {
    try {
      const note = prompt('Optional resolution note:') || '';
      const res = await fetch(`/api/admin/reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      fetchReports();
      fetchOverview();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Handle Promote to Moderator
  const handlePromoteModerator = async (targetUserId: string) => {
    try {
      setActionLoading(true);
      const res = await fetch('/api/admin/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId,
          permissions: selectedPermissions,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setActionSuccess(data.message);
      setActionModal(null);
      fetchRoles();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Demote Moderator
  const handleDemoteModerator = async (targetUserId: string) => {
    if (!confirm('Are you sure you want to demote this moderator to a normal user?')) return;
    try {
      const res = await fetch(`/api/admin/roles?userId=${targetUserId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      fetchRoles();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Handle Update Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: platformSettings,
          reason: 'Settings updated via Admin Panel',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setActionSuccess('Platform settings updated successfully.');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-[#0c0e12] flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="animate-spin text-amber-500" size={32} />
          <p className="text-sm text-[#949aa5]">Verifying administrator credentials...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0c0e12] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#15171e] border border-rose-500/30 rounded-2xl p-6 text-center shadow-2xl">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto mb-4">
            <Lock size={24} />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Access Restricted</h2>
          <p className="text-sm text-[#949aa5] mb-6">{error}</p>
          <div className="flex justify-center gap-3">
            <Link
              href="/"
              className="px-4 py-2 rounded-xl bg-[#1b1e26] hover:bg-[#222530] text-sm font-semibold text-white transition border border-[#282c37]"
            >
              Return to Lounge
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const currentAdmin = overviewData?.currentAdmin;
  const stats = overviewData?.stats;

  return (
    <div className="min-h-screen bg-[#0c0e12] text-[#f3f4f6] flex flex-col antialiased">
      {/* Top Admin Header Bar */}
      <header className="h-16 border-b border-[#282c37] bg-[#15171e]/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 group-hover:bg-amber-500/20 transition">
              <ShieldAlert size={18} />
            </div>
            <div>
              <span className="font-bold text-white tracking-tight">
                SHRED<span className="text-amber-500">oo</span>
              </span>
              <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-amber-500/20 text-amber-400 border border-amber-500/30">
                SUPER ADMIN
              </span>
            </div>
          </Link>
        </div>

        {/* Center Live Status Badge */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-[#1b1e26] border border-[#282c37] text-xs text-[#949aa5]">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Server Cluster: Online</span>
          <span className="text-[#282c37]">•</span>
          <span>LiveKit Cloud</span>
          <span className="text-[#282c37]">•</span>
          <span>Firestore RBAC</span>
        </div>

        {/* Right Admin Profile & Actions */}
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1b1e26] hover:bg-[#222530] text-xs font-semibold text-[#f3f4f6] transition border border-[#282c37]"
          >
            <ArrowLeft size={14} /> Lounge
          </Link>

          <div className="h-6 w-px bg-[#282c37]" />

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-white">{currentAdmin?.username}</p>
              <p className="text-[10px] text-amber-400 font-mono">
                {currentAdmin?.isSuperAdmin ? 'SUPER ADMIN' : 'MODERATOR'}
              </p>
            </div>
            <UserButton appearance={loungeClerkTheme as any} />
          </div>
        </div>
      </header>

      {/* Main Admin Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Navigation Sidebar */}
        <aside className="w-64 border-r border-[#282c37] bg-[#15171e]/50 flex flex-col justify-between p-4 space-y-6">
          <div className="space-y-1">
            <p className="px-3 text-[10px] font-bold text-[#949aa5] tracking-wider uppercase mb-2">
              Platform Administration
            </p>

            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === 'overview'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                  : 'text-[#949aa5] hover:text-white hover:bg-[#1b1e26]'
              }`}
            >
              <BarChart3 size={16} /> Overview
            </button>

            <button
              onClick={() => setActiveTab('users')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === 'users'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                  : 'text-[#949aa5] hover:text-white hover:bg-[#1b1e26]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Users size={16} /> Users
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1b1e26] text-[#949aa5]">
                {stats?.totalUsers || 0}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('rooms')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === 'rooms'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                  : 'text-[#949aa5] hover:text-white hover:bg-[#1b1e26]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Radio size={16} /> Rooms
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1b1e26] text-[#949aa5]">
                {stats?.activeRooms || 0}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('reports')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === 'reports'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                  : 'text-[#949aa5] hover:text-white hover:bg-[#1b1e26]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FileText size={16} /> Reports & Moderation
              </div>
              {stats?.pendingReportsCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 font-bold border border-rose-500/30">
                  {stats.pendingReportsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('roles')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === 'roles'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                  : 'text-[#949aa5] hover:text-white hover:bg-[#1b1e26]'
              }`}
            >
              <KeyRound size={16} /> Admin & Roles
            </button>

            <button
              onClick={() => setActiveTab('providers')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === 'providers'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                  : 'text-[#949aa5] hover:text-white hover:bg-[#1b1e26]'
              }`}
            >
              <Music2 size={16} /> Music Providers
            </button>

            <button
              onClick={() => setActiveTab('audit')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === 'audit'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                  : 'text-[#949aa5] hover:text-white hover:bg-[#1b1e26]'
              }`}
            >
              <History size={16} /> Audit Logs
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === 'settings'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                  : 'text-[#949aa5] hover:text-white hover:bg-[#1b1e26]'
              }`}
            >
              <Settings size={16} /> Platform Settings
            </button>
          </div>

          <div className="p-3 bg-[#1b1e26] border border-[#282c37] rounded-xl text-xs space-y-2">
            <p className="font-semibold text-white flex items-center gap-1.5">
              <Shield size={13} className="text-amber-500" /> Security Protocol
            </p>
            <p className="text-[11px] text-[#949aa5] leading-relaxed">
              Super Admin operations execute with atomic transaction guarantees and immediate
              LiveKit audio disconnects.
            </p>
          </div>
        </aside>

        {/* Content Pane */}
        <main className="flex-1 overflow-y-auto p-8 space-y-6">
          {actionSuccess && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-medium">
                <CheckCircle2 size={16} /> {actionSuccess}
              </div>
              <button onClick={() => setActionSuccess(null)} className="text-emerald-400 hover:text-white">
                <X size={14} />
              </button>
            </div>
          )}

          {/* 1. OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold text-white">Platform Overview</h1>
                  <p className="text-xs text-[#949aa5]">
                    Real-time metrics and system health across SHREDoo
                  </p>
                </div>
                <button
                  onClick={fetchOverview}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1b1e26] hover:bg-[#222530] text-xs font-semibold text-white transition border border-[#282c37]"
                >
                  <RefreshCw size={13} /> Refresh
                </button>
              </div>

              {/* Analytics Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 bg-[#15171e] border border-[#282c37] rounded-2xl">
                  <div className="flex items-center justify-between text-[#949aa5] mb-2">
                    <span className="text-xs font-semibold">Total Registered Users</span>
                    <Users size={16} className="text-amber-500" />
                  </div>
                  <p className="text-2xl font-bold text-white">{stats?.totalUsers || 0}</p>
                  <p className="text-[11px] text-emerald-400 mt-1">
                    {stats?.activeUsers || 0} active ({stats?.suspendedUsers || 0} suspended)
                  </p>
                </div>

                <div className="p-5 bg-[#15171e] border border-[#282c37] rounded-2xl">
                  <div className="flex items-center justify-between text-[#949aa5] mb-2">
                    <span className="text-xs font-semibold">Active Listening Rooms</span>
                    <Radio size={16} className="text-amber-500" />
                  </div>
                  <p className="text-2xl font-bold text-white">{stats?.activeRooms || 0}</p>
                  <p className="text-[11px] text-[#949aa5] mt-1">
                    Total lifetime rooms: {stats?.totalRooms || 0}
                  </p>
                </div>

                <div className="p-5 bg-[#15171e] border border-[#282c37] rounded-2xl">
                  <div className="flex items-center justify-between text-[#949aa5] mb-2">
                    <span className="text-xs font-semibold">Connected Participants</span>
                    <Mic size={16} className="text-emerald-400" />
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {stats?.connectedParticipants || 0}
                  </p>
                  <p className="text-[11px] text-[#949aa5] mt-1">LiveKit WebRTC voice channels</p>
                </div>

                <div className="p-5 bg-[#15171e] border border-[#282c37] rounded-2xl">
                  <div className="flex items-center justify-between text-[#949aa5] mb-2">
                    <span className="text-xs font-semibold">Pending Reports</span>
                    <FileText size={16} className="text-rose-400" />
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {stats?.pendingReportsCount || 0}
                  </p>
                  <p className="text-[11px] text-[#949aa5] mt-1">Moderation queue items</p>
                </div>
              </div>

              {/* Music Providers Status Box */}
              <div className="bg-[#15171e] border border-[#282c37] rounded-2xl p-6 space-y-4">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Music2 size={16} className="text-amber-500" /> Music Provider Integrations
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-[#1b1e26] border border-[#282c37] rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">Jamendo CC Music API</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                          stats?.musicProviders.jamendo.status === 'operational'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {stats?.musicProviders.jamendo.status === 'operational'
                          ? 'OPERATIONAL'
                          : 'DEGRADED'}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#949aa5]">
                      {stats?.musicProviders.jamendo.details}
                    </p>
                  </div>

                  <div className="p-4 bg-[#1b1e26] border border-[#282c37] rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">Bollywood Modular Provider</span>
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                        LICENSING PENDING
                      </span>
                    </div>
                    <p className="text-[11px] text-[#949aa5]">
                      {stats?.musicProviders.bollywood.details}
                    </p>
                  </div>
                </div>
              </div>

              {/* Recent Audit Actions Preview */}
              <div className="bg-[#15171e] border border-[#282c37] rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <History size={16} className="text-amber-500" /> Recent Moderation & Admin
                    Actions
                  </h2>
                  <button
                    onClick={() => setActiveTab('audit')}
                    className="text-xs text-amber-500 hover:text-amber-400 font-semibold"
                  >
                    View All Audit Logs →
                  </button>
                </div>

                <div className="divide-y divide-[#282c37] overflow-hidden rounded-xl border border-[#282c37]">
                  {stats?.recentAuditLogs?.length > 0 ? (
                    stats.recentAuditLogs.slice(0, 5).map((log: any) => (
                      <div
                        key={log.actionId}
                        className="p-3 bg-[#1b1e26] flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-mono text-[10px] border border-amber-500/20">
                            {log.action}
                          </span>
                          <span className="text-white font-medium">
                            {log.adminUsername} on {log.targetType} ({log.targetId})
                          </span>
                          <span className="text-[#949aa5] text-[11px] italic">"{log.reason}"</span>
                        </div>
                        <span className="text-[11px] text-[#949aa5]">
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-xs text-[#949aa5] bg-[#1b1e26]">
                      No administrative actions logged yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 2. USERS TAB */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl font-bold text-white">User Management</h1>
                  <p className="text-xs text-[#949aa5]">
                    Inspect, block, temporarily suspend, or delete user accounts platform-wide
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[#949aa5]"
                    />
                    <input
                      type="text"
                      placeholder="Search username or email..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
                      className="pl-8 pr-3 py-1.5 rounded-xl bg-[#1b1e26] border border-[#282c37] text-xs text-white placeholder-[#949aa5] focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <select
                    value={userStatusFilter}
                    onChange={(e) => setUserStatusFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-[#1b1e26] border border-[#282c37] text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="blocked">Blocked</option>
                  </select>

                  <button
                    onClick={fetchUsers}
                    className="p-1.5 rounded-xl bg-[#1b1e26] hover:bg-[#222530] border border-[#282c37] text-[#949aa5] hover:text-white"
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>
              </div>

              {/* Users Table */}
              <div className="bg-[#15171e] border border-[#282c37] rounded-2xl overflow-hidden shadow-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#1b1e26] border-b border-[#282c37] text-[#949aa5]">
                    <tr>
                      <th className="px-4 py-3 font-semibold">User</th>
                      <th className="px-4 py-3 font-semibold">Clerk User ID</th>
                      <th className="px-4 py-3 font-semibold">Role</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Rooms</th>
                      <th className="px-4 py-3 font-semibold">Registered</th>
                      <th className="px-4 py-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#282c37]">
                    {usersList.length > 0 ? (
                      usersList.map((u) => (
                        <tr key={u.userId} className="hover:bg-[#1b1e26]/50 transition">
                          <td className="px-4 py-3 flex items-center gap-2.5">
                            <img
                              src={
                                u.avatar ||
                                `https://api.dicebear.com/7.x/bottts/svg?seed=${u.username}`
                              }
                              alt=""
                              className="w-7 h-7 rounded-lg border border-[#282c37] object-cover"
                            />
                            <div>
                              <p className="font-bold text-white">{u.username}</p>
                              <p className="text-[10px] text-[#949aa5]">{u.email}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono text-[11px] text-[#949aa5]">
                            {u.userId.slice(0, 14)}...
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                u.role === 'SUPER_ADMIN'
                                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                  : u.role === 'MODERATOR'
                                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                  : 'bg-[#1b1e26] text-[#949aa5]'
                              }`}
                            >
                              {u.role}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                u.status === 'active'
                                  ? 'bg-emerald-500/10 text-emerald-400'
                                  : u.status === 'suspended'
                                  ? 'bg-amber-500/10 text-amber-400'
                                  : 'bg-rose-500/10 text-rose-400'
                              }`}
                            >
                              {u.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-white font-medium">{u.roomsCreated}</td>
                          <td className="px-4 py-3 text-[#949aa5] text-[11px]">
                            {new Date(u.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-right space-x-1">
                            {u.role !== 'SUPER_ADMIN' && (
                              <>
                                {u.status === 'active' ? (
                                  <>
                                    <button
                                      onClick={() => setActionModal({ type: 'suspend', target: u })}
                                      className="px-2.5 py-1 rounded-lg bg-[#1b1e26] hover:bg-amber-500/20 hover:text-amber-400 text-[#949aa5] border border-[#282c37] transition text-[11px] font-semibold"
                                    >
                                      Suspend
                                    </button>
                                    <button
                                      onClick={() => setActionModal({ type: 'block', target: u })}
                                      className="px-2.5 py-1 rounded-lg bg-[#1b1e26] hover:bg-rose-500/20 hover:text-rose-400 text-[#949aa5] border border-[#282c37] transition text-[11px] font-semibold"
                                    >
                                      Block
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    onClick={() => handleUserRestriction(u.userId, 'restore')}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition text-[11px] font-semibold"
                                  >
                                    Restore
                                  </button>
                                )}

                                {currentAdmin?.isSuperAdmin && (
                                  <button
                                    onClick={() =>
                                      setActionModal({ type: 'delete_user', target: u })
                                    }
                                    className="p-1.5 rounded-lg bg-[#1b1e26] hover:bg-rose-500/20 text-[#949aa5] hover:text-rose-400 border border-[#282c37] transition inline-block align-middle"
                                    title="Delete Account"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                )}
                              </>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-[#949aa5]">
                          No users matching search filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. ROOMS TAB */}
          {activeTab === 'rooms' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl font-bold text-white">Room Management</h1>
                  <p className="text-xs text-[#949aa5]">
                    Inspect active listening lounges, invalidate codes, or eject abusive participants
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[#949aa5]"
                    />
                    <input
                      type="text"
                      placeholder="Search room name or host..."
                      value={roomSearch}
                      onChange={(e) => setRoomSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && fetchRooms()}
                      className="pl-8 pr-3 py-1.5 rounded-xl bg-[#1b1e26] border border-[#282c37] text-xs text-white placeholder-[#949aa5] focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <select
                    value={roomStatusFilter}
                    onChange={(e) => setRoomStatusFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-[#1b1e26] border border-[#282c37] text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="all">All Rooms</option>
                    <option value="active">Active Only</option>
                    <option value="closed">Closed Only</option>
                  </select>

                  <button
                    onClick={fetchRooms}
                    className="p-1.5 rounded-xl bg-[#1b1e26] hover:bg-[#222530] border border-[#282c37] text-[#949aa5] hover:text-white"
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>
              </div>

              {/* Rooms Table */}
              <div className="bg-[#15171e] border border-[#282c37] rounded-2xl overflow-hidden shadow-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#1b1e26] border-b border-[#282c37] text-[#949aa5]">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Room Name</th>
                      <th className="px-4 py-3 font-semibold">Host</th>
                      <th className="px-4 py-3 font-semibold">Participants</th>
                      <th className="px-4 py-3 font-semibold">Invite Code</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#282c37]">
                    {roomsList.length > 0 ? (
                      roomsList.map((r) => (
                        <tr key={r.id} className="hover:bg-[#1b1e26]/50 transition">
                          <td className="px-4 py-3">
                            <p className="font-bold text-white">{r.name}</p>
                            <p className="text-[10px] font-mono text-[#949aa5]">ID: {r.id}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-white">{r.ownerUsername}</p>
                            <p className="text-[10px] text-[#949aa5]">{r.ownerEmail}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-semibold text-white">
                              {r.participantCount} / {r.maxParticipants}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-[11px] text-[#949aa5]">
                            {r.codeStatus}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                r.status === 'active'
                                  ? 'bg-emerald-500/10 text-emerald-400'
                                  : 'bg-rose-500/10 text-rose-400'
                              }`}
                            >
                              {r.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right space-x-1">
                            <button
                              onClick={() => handleRoomAction(r.id, 'revoke_code')}
                              className="px-2.5 py-1 rounded-lg bg-[#1b1e26] hover:bg-[#222530] text-[#949aa5] hover:text-amber-400 border border-[#282c37] transition text-[11px] font-semibold"
                              title="Regenerate invitation code & invalidate previous"
                            >
                              Revoke Code
                            </button>

                            {r.status === 'active' ? (
                              <button
                                onClick={() => handleRoomAction(r.id, 'close')}
                                className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition text-[11px] font-semibold"
                              >
                                Close
                              </button>
                            ) : (
                              <button
                                onClick={() => handleRoomAction(r.id, 'reopen')}
                                className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition text-[11px] font-semibold"
                              >
                                Reopen
                              </button>
                            )}

                            {currentAdmin?.isSuperAdmin && (
                              <button
                                onClick={() => handleRoomAction(r.id, 'delete')}
                                className="p-1.5 rounded-lg bg-[#1b1e26] hover:bg-rose-500/20 text-[#949aa5] hover:text-rose-400 border border-[#282c37] transition inline-block align-middle"
                                title="Delete Room"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-[#949aa5]">
                          No rooms matching search filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 4. MODERATION & REPORTS TAB */}
          {activeTab === 'reports' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl font-bold text-white">Moderation Reports</h1>
                  <p className="text-xs text-[#949aa5]">
                    Handle complaints submitted by lounge members for harassment, abuse, or misconduct
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <select
                    value={reportFilter}
                    onChange={(e) => setReportFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-[#1b1e26] border border-[#282c37] text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="all">All Reports</option>
                    <option value="pending">Pending</option>
                    <option value="under_review">Under Review</option>
                    <option value="resolved">Resolved</option>
                    <option value="dismissed">Dismissed</option>
                  </select>

                  <button
                    onClick={fetchReports}
                    className="p-1.5 rounded-xl bg-[#1b1e26] hover:bg-[#222530] border border-[#282c37] text-[#949aa5] hover:text-white"
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>
              </div>

              {/* Reports List */}
              <div className="space-y-3">
                {reportsList.length > 0 ? (
                  reportsList.map((rep) => (
                    <div
                      key={rep.reportId}
                      className="bg-[#15171e] border border-[#282c37] rounded-2xl p-5 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              rep.status === 'pending'
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : rep.status === 'under_review'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : rep.status === 'resolved'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-[#1b1e26] text-[#949aa5]'
                            }`}
                          >
                            {rep.status.toUpperCase()}
                          </span>
                          <span className="text-xs font-bold text-white uppercase font-mono">
                            Reason: {rep.reason.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <span className="text-[11px] text-[#949aa5]">
                          {new Date(rep.createdAt).toLocaleString()}
                        </span>
                      </div>

                      <div className="text-xs text-[#949aa5] space-y-1">
                        <p>
                          <strong className="text-white">Reported By:</strong>{' '}
                          {rep.reportedByName} ({rep.reportedBy})
                        </p>
                        {rep.targetUsername && (
                          <p>
                            <strong className="text-white">Target User:</strong>{' '}
                            {rep.targetUsername} ({rep.targetUserId})
                          </p>
                        )}
                        {rep.roomName && (
                          <p>
                            <strong className="text-white">Target Room:</strong> {rep.roomName} (
                            {rep.roomId})
                          </p>
                        )}
                      </div>

                      <div className="p-3 bg-[#1b1e26] rounded-xl text-xs text-white">
                        <p className="font-medium">"{rep.details}"</p>
                      </div>

                      {rep.resolutionNote && (
                        <p className="text-[11px] text-emerald-400 italic">
                          Resolution note ({rep.resolvedByName}): "{rep.resolutionNote}"
                        </p>
                      )}

                      <div className="flex items-center gap-2 pt-2 border-t border-[#282c37]">
                        {rep.status === 'pending' && (
                          <button
                            onClick={() => handleReportStatus(rep.reportId, 'under_review')}
                            className="px-3 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-semibold border border-amber-500/30"
                          >
                            Mark Under Review
                          </button>
                        )}
                        {rep.status !== 'resolved' && (
                          <button
                            onClick={() => handleReportStatus(rep.reportId, 'resolved')}
                            className="px-3 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold border border-emerald-500/30"
                          >
                            Resolve Report
                          </button>
                        )}
                        {rep.status !== 'dismissed' && (
                          <button
                            onClick={() => handleReportStatus(rep.reportId, 'dismissed')}
                            className="px-3 py-1 rounded-lg bg-[#1b1e26] hover:bg-[#222530] text-[#949aa5] text-xs font-semibold border border-[#282c37]"
                          >
                            Dismiss
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-xs text-[#949aa5] bg-[#15171e] rounded-2xl border border-[#282c37]">
                    No moderation reports found.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 5. ADMIN & ROLES TAB */}
          {activeTab === 'roles' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold text-white">Admin & Role Delegation</h1>
                  <p className="text-xs text-[#949aa5]">
                    Manage moderators, assign granular permission flags, and audit staff privileges
                  </p>
                </div>

                {currentAdmin?.isSuperAdmin && (
                  <button
                    onClick={() => {
                      const uid = prompt('Enter the Clerk User ID of the user to promote:');
                      if (uid) setActionModal({ type: 'promote_mod', target: { userId: uid } });
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-xs font-bold text-white shadow-md shadow-amber-950/40"
                  >
                    <Shield size={14} /> Promote Moderator
                  </button>
                )}
              </div>

              {/* Roles Table */}
              <div className="bg-[#15171e] border border-[#282c37] rounded-2xl overflow-hidden shadow-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#1b1e26] border-b border-[#282c37] text-[#949aa5]">
                    <tr>
                      <th className="px-4 py-3 font-semibold">User</th>
                      <th className="px-4 py-3 font-semibold">Role</th>
                      <th className="px-4 py-3 font-semibold">Granted Permissions</th>
                      <th className="px-4 py-3 font-semibold">Assigned By</th>
                      <th className="px-4 py-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#282c37]">
                    {rolesList.map((r) => (
                      <tr key={r.clerkUserId} className="hover:bg-[#1b1e26]/50 transition">
                        <td className="px-4 py-3">
                          <p className="font-bold text-white">{r.username}</p>
                          <p className="text-[10px] font-mono text-[#949aa5]">{r.clerkUserId}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              r.isSuperAdmin
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            }`}
                          >
                            {r.role}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1 max-w-md">
                            {r.permissions?.map((p: string) => (
                              <span
                                key={p}
                                className="px-1.5 py-0.5 rounded bg-[#1b1e26] text-[9px] font-mono text-[#949aa5]"
                              >
                                {p}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[#949aa5]">{r.assignedBy}</td>
                        <td className="px-4 py-3 text-right">
                          {!r.isSuperAdmin && currentAdmin?.isSuperAdmin && (
                            <button
                              onClick={() => handleDemoteModerator(r.clerkUserId)}
                              className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[11px] font-semibold"
                            >
                              Demote
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 6. MUSIC PROVIDERS TAB */}
          {activeTab === 'providers' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl font-bold text-white">Music Provider Configuration</h1>
                <p className="text-xs text-[#949aa5]">
                  Manage Creative Commons licensing, Bollywood modular catalogue, and stream playback controls
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Jamendo Provider */}
                <div className="bg-[#15171e] border border-[#282c37] rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                        <Disc size={20} />
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-white">Jamendo Music API</h2>
                        <p className="text-xs text-[#949aa5]">Creative Commons Streaming Engine</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      OFFICIAL API
                    </span>
                  </div>

                  <div className="space-y-2 text-xs text-[#949aa5] leading-relaxed">
                    <p>
                      <strong className="text-white">License Compliance:</strong> All audio playback
                      is filtered strictly for Creative Commons non-commercial attribution licenses.
                    </p>
                    <p>
                      <strong className="text-white">Client ID:</strong> Server-side env variable{' '}
                      <code className="text-amber-400 font-mono">JAMENDO_CLIENT_ID</code>.
                    </p>
                    <p>
                      <strong className="text-white">Streaming URL:</strong> High-fidelity MP3/OGG
                      direct stream from Jamendo CDN.
                    </p>
                  </div>
                </div>

                {/* Bollywood Provider */}
                <div className="bg-[#15171e] border border-[#282c37] rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                        <Volume2 size={20} />
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-white">Bollywood Modular Provider</h2>
                        <p className="text-xs text-[#949aa5]">Catalogue & Metadata Engine</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                      LICENSING PENDING
                    </span>
                  </div>

                  <div className="space-y-2 text-xs text-[#949aa5] leading-relaxed">
                    <p>
                      <strong className="text-white">Status:</strong> Metadata catalogue enabled;
                      direct stream playback is strictly gated.
                    </p>
                    <p>
                      <strong className="text-white">Anti-Scraping Policy:</strong> No scraping of
                      commercial platforms (Spotify, YouTube, JioSaavn, Gaana) is allowed or
                      executed.
                    </p>
                    <p>
                      <strong className="text-white">Commercial License:</strong> Audio streams will
                      activate automatically once a verified commercial streaming agreement is
                      configured.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 7. ANALYTICS TAB */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl font-bold text-white">Platform Analytics</h1>
                <p className="text-xs text-[#949aa5]">
                  Detailed breakdown of active accounts, room utilization, and live audio channels
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#15171e] border border-[#282c37] rounded-2xl p-5 space-y-2">
                  <p className="text-xs font-semibold text-[#949aa5]">User Account Health</p>
                  <p className="text-3xl font-bold text-white">{stats?.totalUsers || 0}</p>
                  <div className="space-y-1 pt-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-emerald-400">Active</span>
                      <span className="text-white font-medium">{stats?.activeUsers || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-amber-400">Suspended</span>
                      <span className="text-white font-medium">{stats?.suspendedUsers || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-rose-400">Blocked / Banned</span>
                      <span className="text-white font-medium">{stats?.blockedUsers || 0}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-[#15171e] border border-[#282c37] rounded-2xl p-5 space-y-2">
                  <p className="text-xs font-semibold text-[#949aa5]">Lounge Utilization</p>
                  <p className="text-3xl font-bold text-white">{stats?.activeRooms || 0}</p>
                  <div className="space-y-1 pt-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[#949aa5]">Active Lounges</span>
                      <span className="text-white font-medium">{stats?.activeRooms || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#949aa5]">Closed Lounges</span>
                      <span className="text-white font-medium">
                        {(stats?.totalRooms || 0) - (stats?.activeRooms || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#949aa5]">Max Capacity Per Room</span>
                      <span className="text-amber-400 font-medium">5 Listeners</span>
                    </div>
                  </div>
                </div>

                <div className="bg-[#15171e] border border-[#282c37] rounded-2xl p-5 space-y-2">
                  <p className="text-xs font-semibold text-[#949aa5]">Audio Infrastructure</p>
                  <p className="text-3xl font-bold text-emerald-400">LiveKit</p>
                  <div className="space-y-1 pt-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[#949aa5]">Voice Channels</span>
                      <span className="text-white font-medium">WebRTC Mesh</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#949aa5]">Bitrate & Codec</span>
                      <span className="text-white font-medium">Opus 48kHz</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#949aa5]">Independent Volume</span>
                      <span className="text-emerald-400 font-medium">GainNode AudioMixer</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 8. AUDIT LOGS TAB */}
          {activeTab === 'audit' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold text-white">Immutable Audit Logs</h1>
                  <p className="text-xs text-[#949aa5]">
                    Tamper-resistant historical trail of all administrative actions, bans, and setting changes
                  </p>
                </div>
                <button
                  onClick={fetchAuditLogs}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1b1e26] hover:bg-[#222530] text-xs font-semibold text-white transition border border-[#282c37]"
                >
                  <RefreshCw size={13} /> Refresh Logs
                </button>
              </div>

              <div className="bg-[#15171e] border border-[#282c37] rounded-2xl overflow-hidden shadow-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#1b1e26] border-b border-[#282c37] text-[#949aa5]">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Timestamp</th>
                      <th className="px-4 py-3 font-semibold">Administrator</th>
                      <th className="px-4 py-3 font-semibold">Action</th>
                      <th className="px-4 py-3 font-semibold">Target</th>
                      <th className="px-4 py-3 font-semibold">Reason / Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#282c37]">
                    {auditLogs.length > 0 ? (
                      auditLogs.map((log) => (
                        <tr key={log.actionId} className="hover:bg-[#1b1e26]/50 transition">
                          <td className="px-4 py-3 text-[#949aa5] font-mono text-[11px]">
                            {new Date(log.createdAt).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 font-bold text-white">
                            {log.adminUsername}{' '}
                            <span className="font-mono text-[10px] text-[#949aa5] font-normal">
                              ({log.adminId.slice(0, 8)}...)
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-mono text-[10px] border border-amber-500/20">
                              {log.action}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-[11px] text-white">
                            {log.targetType}: {log.targetId}
                          </td>
                          <td className="px-4 py-3 text-[#f3f4f6]">{log.reason}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-[#949aa5]">
                          No audit log entries recorded.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 9. PLATFORM SETTINGS TAB */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl font-bold text-white">Platform Settings</h1>
                <p className="text-xs text-[#949aa5]">
                  Control global access policies, registration gates, and maximum room quotas
                </p>
              </div>

              {platformSettings ? (
                <form
                  onSubmit={handleSaveSettings}
                  className="bg-[#15171e] border border-[#282c37] rounded-2xl p-6 space-y-6 max-w-2xl"
                >
                  <div className="space-y-4">
                    <label className="flex items-center justify-between p-4 bg-[#1b1e26] rounded-xl border border-[#282c37] cursor-pointer">
                      <div>
                        <p className="text-xs font-bold text-white">Maintenance Mode</p>
                        <p className="text-[11px] text-[#949aa5]">
                          Temporarily block non-admin access while performing updates
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={platformSettings.maintenanceMode}
                        onChange={(e) =>
                          setPlatformSettings({
                            ...platformSettings,
                            maintenanceMode: e.target.checked,
                          })
                        }
                        className="w-4 h-4 rounded text-amber-600 focus:ring-0"
                      />
                    </label>

                    <label className="flex items-center justify-between p-4 bg-[#1b1e26] rounded-xl border border-[#282c37] cursor-pointer">
                      <div>
                        <p className="text-xs font-bold text-white">New User Registration</p>
                        <p className="text-[11px] text-[#949aa5]">
                          Allow new accounts to register through verified Google OAuth
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={platformSettings.registrationOpen}
                        onChange={(e) =>
                          setPlatformSettings({
                            ...platformSettings,
                            registrationOpen: e.target.checked,
                          })
                        }
                        className="w-4 h-4 rounded text-amber-600 focus:ring-0"
                      />
                    </label>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-white">Max Room Capacity</label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={platformSettings.maxRoomCapacity}
                        onChange={(e) =>
                          setPlatformSettings({
                            ...platformSettings,
                            maxRoomCapacity: Number(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-[#1b1e26] border border-[#282c37] text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                      <p className="text-[10px] text-[#949aa5]">Default: 5 listeners</p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-white">
                        Max Rooms Per Host
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={platformSettings.maxRoomsPerUser}
                        onChange={(e) =>
                          setPlatformSettings({
                            ...platformSettings,
                            maxRoomsPerUser: Number(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-[#1b1e26] border border-[#282c37] text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  {currentAdmin?.isSuperAdmin && (
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-xs font-bold text-white transition shadow-md shadow-amber-950/40"
                    >
                      {actionLoading ? 'Saving Settings...' : 'Save Platform Settings'}
                    </button>
                  )}
                </form>
              ) : (
                <div className="p-8 text-center text-xs text-[#949aa5] bg-[#15171e] rounded-2xl border border-[#282c37]">
                  Loading settings...
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* MODAL DIALOGS */}
      {actionModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#15171e] border border-[#282c37] rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <ShieldAlert size={16} className="text-amber-500" /> Confirm Action: {actionModal.type}
              </h3>
              <button
                onClick={() => setActionModal(null)}
                className="text-[#949aa5] hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-[#949aa5]">
              Target: <strong className="text-white">{actionModal.target?.username || actionModal.target?.name || actionModal.target?.userId}</strong>
            </p>

            {actionModal.type === 'suspend' && (
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#949aa5]">
                  Suspension Duration (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={suspendDays}
                  onChange={(e) => setSuspendDays(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#1b1e26] border border-[#282c37] text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            )}

            {actionModal.type === 'promote_mod' ? (
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-[#949aa5]">
                  Select Permissions
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-[#1b1e26] rounded-xl border border-[#282c37]">
                  {[
                    'users.read',
                    'users.suspend',
                    'users.block',
                    'rooms.read',
                    'rooms.close',
                    'rooms.remove_members',
                    'reports.manage',
                    'analytics.read',
                  ].map((perm) => (
                    <label key={perm} className="flex items-center gap-1.5 text-[10px] text-white cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedPermissions.includes(perm)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedPermissions([...selectedPermissions, perm]);
                          else setSelectedPermissions(selectedPermissions.filter((p) => p !== perm));
                        }}
                        className="w-3.5 h-3.5 text-amber-500 rounded"
                      />
                      <span>{perm}</span>
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#949aa5]">
                  Moderation Reason (Required)
                </label>
                <textarea
                  placeholder="Explain why this action is being taken..."
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl bg-[#1b1e26] border border-[#282c37] text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setActionModal(null)}
                className="px-4 py-2 rounded-xl bg-[#1b1e26] hover:bg-[#222530] text-xs font-semibold text-white border border-[#282c37]"
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  if (actionModal.type === 'block') {
                    handleUserRestriction(actionModal.target.userId, 'restrict', 'blocked');
                  } else if (actionModal.type === 'suspend') {
                    handleUserRestriction(actionModal.target.userId, 'restrict', 'suspended');
                  } else if (actionModal.type === 'delete_user') {
                    handleDeleteUser(actionModal.target.userId);
                  } else if (actionModal.type === 'promote_mod') {
                    handlePromoteModerator(actionModal.target.userId);
                  }
                }}
                disabled={actionLoading || (actionModal.type !== 'promote_mod' && !actionReason.trim())}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-xs font-bold text-white shadow-md shadow-amber-950/40"
              >
                {actionLoading ? 'Processing...' : 'Confirm Action'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

