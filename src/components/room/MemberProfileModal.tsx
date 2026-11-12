'use client';

import React, { useState } from 'react';
import { RoomMember } from '@/types';
import { X, ShieldCheck, Clock, Radio, Volume2, UserCheck, Flag, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface MemberProfileModalProps {
  member: RoomMember | null;
  onClose: () => void;
}

export function MemberProfileModal({ member, onClose }: MemberProfileModalProps) {
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState('harassment');
  const [reportDetails, setReportDetails] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  if (!member) return null;

  const handleSendReport = async () => {
    if (!reportDetails.trim()) {
      alert('Please describe the misconduct for the moderation team.');
      return;
    }
    try {
      setSubmittingReport(true);
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: member.userId,
          targetUsername: member.username,
          reason: reportReason,
          details: reportDetails,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setReportSuccess(true);
      setTimeout(() => {
        setShowReport(false);
        setReportSuccess(false);
        setReportDetails('');
      }, 2000);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSubmittingReport(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-3xl bg-lounge-surface border border-lounge-border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="relative h-24 bg-gradient-to-r from-lounge-card via-lounge-border/40 to-lounge-card p-4 flex justify-end">
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-black/40 hover:bg-black/70 flex items-center justify-center text-lounge-textMuted hover:text-white transition"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 pb-6 pt-0 relative">
          <div className="flex items-end justify-between -mt-12 mb-4">
            <div className="relative">
              <img
                src={member.userAvatar}
                alt={member.username}
                className="w-20 h-20 rounded-2xl border-4 border-lounge-surface bg-lounge-bg object-cover shadow-xl"
              />
              <span
                className={`absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full border-2 border-lounge-surface ${
                  member.status === 'connected'
                    ? 'bg-emerald-500'
                    : member.status === 'reconnecting'
                    ? 'bg-amber-500'
                    : 'bg-red-500'
                }`}
              />
            </div>

            <div className="flex gap-2">
              <span
                className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  member.role === 'owner'
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                    : member.role === 'moderator'
                    ? 'bg-lounge-sage/20 text-lounge-sage border border-lounge-sage/30'
                    : 'bg-lounge-card text-lounge-textMuted border border-lounge-border'
                }`}
              >
                {member.role}
              </span>
            </div>
          </div>

          <h3 className="text-lg font-bold text-white mb-0.5">{member.username}</h3>
          <p className="text-[11px] text-lounge-textMuted mb-5 font-mono">User ID: {member.userId}</p>

          {!showReport ? (
            <div className="space-y-2.5 bg-lounge-card/70 rounded-2xl p-4 border border-lounge-border">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-lounge-textMuted">
                  <Clock size={14} className="text-amber-500" /> Joined At
                </span>
                <span className="text-lounge-text font-medium">
                  {new Date(member.joinedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (
                  {Math.max(1, Math.round((Date.now() - new Date(member.joinedAt).getTime()) / 60000))} min ago)
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-lounge-textMuted">
                  <Radio size={14} className="text-amber-500" /> Connection Status
                </span>
                <span
                  className={`capitalize font-semibold ${
                    member.status === 'connected'
                      ? 'text-emerald-400'
                      : member.status === 'reconnecting'
                      ? 'text-amber-400'
                      : 'text-red-400'
                  }`}
                >
                  {member.status}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-lounge-textMuted">
                  <Volume2 size={14} className="text-amber-500" /> Voice Stream
                </span>
                <span className="text-lounge-text font-medium">
                  {member.isMuted ? 'Muted' : 'Transmitting Audio'}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-lounge-textMuted">
                  <ShieldCheck size={14} className="text-amber-500" /> Room Permissions
                </span>
                <span className="text-lounge-text font-medium">
                  {member.role === 'owner'
                    ? 'Full Host Privileges'
                    : member.role === 'moderator'
                    ? 'Moderation Privileges'
                    : 'Standard Participant'}
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-lounge-card/90 rounded-2xl p-4 border border-rose-500/30 space-y-3">
              {reportSuccess ? (
                <div className="text-center py-4 text-emerald-400 text-xs font-semibold flex flex-col items-center gap-2">
                  <CheckCircle2 size={24} /> Report filed to Platform Moderation.
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-rose-400 text-xs font-bold">
                    <AlertTriangle size={15} /> Report User Misconduct
                  </div>
                  <div>
                    <label className="text-[10px] text-[#949aa5] font-semibold">Reason</label>
                    <select
                      value={reportReason}
                      onChange={(e) => setReportReason(e.target.value)}
                      className="w-full mt-1 px-3 py-1.5 rounded-xl bg-[#15171e] border border-[#282c37] text-xs text-white"
                    >
                      <option value="harassment">Harassment / Bullying</option>
                      <option value="abuse">Verbal Abuse / Hate Speech</option>
                      <option value="spam">Spam / Disruptive Noise</option>
                      <option value="inappropriate_username">Inappropriate Username</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-[#949aa5] font-semibold">Description</label>
                    <textarea
                      placeholder="Please describe what happened..."
                      value={reportDetails}
                      onChange={(e) => setReportDetails(e.target.value)}
                      rows={2}
                      className="w-full mt-1 px-3 py-1.5 rounded-xl bg-[#15171e] border border-[#282c37] text-xs text-white"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      onClick={() => setShowReport(false)}
                      className="px-3 py-1.5 rounded-xl bg-[#15171e] text-xs text-[#949aa5] hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSendReport}
                      disabled={submittingReport}
                      className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white shadow"
                    >
                      {submittingReport ? 'Sending...' : 'Submit Report'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="mt-5 flex items-center justify-between">
            {!showReport ? (
              <button
                onClick={() => setShowReport(true)}
                className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 transition"
              >
                <Flag size={13} /> Report User
              </button>
            ) : <div />}

            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-lounge-card hover:bg-lounge-border border border-lounge-border text-white text-xs font-semibold transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


