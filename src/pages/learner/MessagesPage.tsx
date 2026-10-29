import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Send, MessageSquare, Phone, MoreVertical, Calendar } from 'lucide-react';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatRelativeTime, formatTime } from '@/utils/format';
import { cn } from '@/utils/cn';
import { useAuth } from '@/context/AuthContext';
import type { Conversation, Message } from '@/types';
import { getConversations, getOrCreateConversation, markConversationRead, sendMessage as persistMessage } from '@/services/messageService';
import { getProviderById } from '@/services/providerService';
import { getOrCreateProviderProfile } from '@/services/providerSkillsService';

export function MessagesPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [active, setActive] = useState<Conversation | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getConversations(user.id);
      setConversations(data);
      setActive(current => data.find(item => item.id === current?.id) ?? data[0] ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load messages.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const providerUserId = searchParams.get('providerId');
    const skillName = searchParams.get('skill');
    if (!user?.id || !providerUserId || !skillName) return;
    let cancelled = false;
    (async () => {
      try {
        const provider = await getProviderById(providerUserId);
        if (!provider) throw new Error('Provider profile was not found.');
        const providerId = await getOrCreateProviderProfile(provider.userId, provider.city);
        if (!providerId) throw new Error('Provider profile is not available.');
        const conversationId = await getOrCreateConversation(user.id, providerId, skillName);
        await load();
        if (!cancelled) {
          const refreshed = await getConversations(user.id);
          setConversations(refreshed);
          setActive(refreshed.find(item => item.id === conversationId) ?? null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not open conversation.');
      }
    })();
    return () => { cancelled = true; };
  }, [load, searchParams, user?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [active?.messages]);

  useEffect(() => {
    if (!active || !user?.id || active.unreadCount === 0) return;
    markConversationRead(active.id, user.id).then(() => {
      setConversations(previous => previous.map(conversation => conversation.id === active.id
        ? { ...conversation, unreadCount: 0, messages: conversation.messages.map(message => message.senderId !== user.id ? { ...message, isRead: true } : message) }
        : conversation));
    }).catch(() => undefined);
  }, [active?.id, active?.unreadCount, user?.id]);

  const sendMessage = async () => {
    if (!input.trim() || !active || !user?.id || sending) return;
    setSending(true);
    try {
      const newMsg: Message = await persistMessage(active.id, user.id, input.trim());
      const updated: Conversation = {
        ...active,
        messages: [...active.messages, newMsg],
        lastMessage: newMsg.content,
        lastMessageTime: newMsg.timestamp,
        unreadCount: 0,
      };
      setActive(updated);
      setConversations(previous => previous.map(conversation => conversation.id === active.id ? updated : conversation));
      setInput('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send message.');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const selectConv = (conv: Conversation) => {
    setActive(conv);
  };

  return (
    <DashboardLayout title="Messages">
      {loading ? (
        <div className="flex items-center justify-center py-16" role="status">Loading messages…</div>
      ) : error ? (
        <EmptyState icon={<MessageSquare className="w-6 h-6" />} title="Could not load messages" description={error}
          action={{ label: 'Try Again', onClick: load }} />
      ) : conversations.length === 0 ? (
        <EmptyState
          icon={<MessageSquare className="w-6 h-6" />}
          title="No messages yet"
          description="Your conversations with providers or learners will appear here."
        />
      ) : (
      <div className="card overflow-hidden" style={{ height: 'calc(100vh - 200px)', minHeight: '500px' }}>
        <div className="flex h-full">
          {/* Conversation list */}
          <aside className="w-72 shrink-0 border-r border-[#E2E8F0] dark:border-[#1E293B] flex flex-col">
            <div className="p-3 border-b border-[#E2E8F0] dark:border-[#1E293B]">
              <input type="search" placeholder="Search conversations…" className="input-base py-2 text-xs" />
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-[#E2E8F0] dark:divide-[#1E293B]">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => selectConv(conv)}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors',
                    active?.id === conv.id && 'bg-indigo-50 dark:bg-indigo-950/20'
                  )}
                >
                  <Avatar src={conv.participantAvatar} name={conv.participantName} size="md" online={conv.isOnline} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={cn('text-sm font-medium truncate', active?.id === conv.id ? 'text-indigo-700 dark:text-indigo-300' : 'text-[#0F172A] dark:text-slate-100')}>
                        {conv.participantName}
                      </p>
                      <span className="text-[10px] text-slate-400 shrink-0 ml-1">{formatRelativeTime(conv.lastMessageTime).replace(' ago', '')}</span>
                    </div>
                    {conv.relatedSkill && (
                      <p className="text-[10px] text-indigo-500 dark:text-indigo-400 font-medium">{conv.relatedSkill}</p>
                    )}
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{conv.lastMessage}</p>
                  </div>
                  {conv.unreadCount > 0 && (
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                      {conv.unreadCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </aside>

          {/* Chat window */}
          {active ? (
            <div className="flex-1 flex flex-col min-w-0">
              {/* Chat header */}
              <div className="flex items-center gap-3 px-5 py-3 border-b border-[#E2E8F0] dark:border-[#1E293B] shrink-0">
                <Avatar src={active.participantAvatar} name={active.participantName} size="md" online={active.isOnline} />
                <div className="flex-1">
                  <p className="font-semibold text-[#0F172A] dark:text-slate-100 text-sm">{active.participantName}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {active.isOnline ? 'Online now' : 'Offline'}{active.relatedSkill ? ` · ${active.relatedSkill}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button className="btn-ghost p-2" aria-label="Schedule session">
                    <Calendar className="w-4 h-4" />
                  </button>
                  <button className="btn-ghost p-2" aria-label="More options">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {active.messages.map((msg) => {
                  const isOwn = msg.senderId === (user?.id ?? 'u1');
                  return (
                    <div key={msg.id} className={cn('flex items-end gap-2', isOwn && 'flex-row-reverse')}>
                      {!isOwn && (
                        <Avatar src={active.participantAvatar} name={active.participantName} size="xs" />
                      )}
                      <div className={cn('max-w-[70%] space-y-1', isOwn && 'items-end flex flex-col')}>
                        <div className={cn(
                          'px-4 py-2.5 rounded-2xl text-sm leading-relaxed',
                          isOwn
                            ? 'bg-indigo-600 text-white rounded-br-sm'
                            : 'bg-slate-100 dark:bg-slate-800 text-[#0F172A] dark:text-slate-100 rounded-bl-sm'
                        )}>
                          {msg.content}
                        </div>
                        <span className="text-[10px] text-slate-400 px-1">
                          {formatRelativeTime(msg.timestamp)}
                        </span>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="px-5 py-3 border-t border-[#E2E8F0] dark:border-[#1E293B] shrink-0">
                <div className="flex items-center gap-3">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message…"
                    className="input-base flex-1 py-2.5"
                    aria-label="Message input"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!input.trim() || sending}
                    className="btn-primary p-2.5 rounded-xl disabled:opacity-40"
                    aria-label="Send message"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <EmptyState
                icon={<MessageSquare className="w-6 h-6" />}
                title="No conversation selected"
                description="Pick a conversation from the list to start messaging."
              />
            </div>
          )}
        </div>
      </div>
      )}
    </DashboardLayout>
  );
}
