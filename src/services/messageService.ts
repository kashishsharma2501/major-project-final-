import { supabase } from '@/lib/supabase';
import type { Conversation, Message } from '@/types';

interface ConversationRow {
  id: string;
  learner_id: string;
  provider_id: string;
  related_skill: string | null;
  last_message: string;
  last_message_at: string;
  provider: {
    user_id: string;
    profiles: { name: string; avatar_url: string | null } | null;
  } | null;
  learner: { id: string; name: string; avatar_url: string | null } | null;
  messages: MessageRow[];
}

interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  msg_type: Message['type'];
  created_at: string;
  sender: { name: string; avatar_url: string | null } | null;
}

const CONVERSATION_SELECT = `
  id, learner_id, provider_id, related_skill, last_message, last_message_at,
  learner:profiles!conversations_learner_id_fkey(id,name,avatar_url),
  provider:provider_profiles!conversations_provider_id_fkey(
    user_id, profiles(name,avatar_url)
  ),
  messages(id,conversation_id,sender_id,content,is_read,msg_type,created_at,
    sender:profiles!messages_sender_id_fkey(name,avatar_url))
`.trim();

export async function getConversations(userId: string): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from('conversations')
    .select(CONVERSATION_SELECT)
    .order('last_message_at', { ascending: false });
  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as ConversationRow[]).map(row => {
    const isLearner = row.learner_id === userId;
    const participant = isLearner ? row.provider?.profiles : row.learner;
    const providerUserId = row.provider?.user_id ?? '';
    const messages = [...(row.messages ?? [])]
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map(message => ({
        id: message.id,
        conversationId: message.conversation_id,
        senderId: message.sender_id,
        senderName: message.sender?.name ?? 'Unknown',
        senderAvatar: message.sender?.avatar_url ?? undefined,
        content: message.content,
        timestamp: message.created_at,
        isRead: message.is_read,
        type: message.msg_type,
      }));
    const unreadCount = messages.filter(message => message.senderId !== userId && !message.isRead).length;
    return {
      id: row.id,
      ownerId: userId,
      participantId: isLearner ? providerUserId : row.learner_id,
      participantName: participant?.name ?? 'Unknown',
      participantAvatar: participant?.avatar_url ?? undefined,
      participantRole: isLearner ? 'provider' : 'learner',
      lastMessage: row.last_message,
      lastMessageTime: row.last_message_at,
      unreadCount,
      isOnline: false,
      relatedSkill: row.related_skill ?? undefined,
      messages,
    };
  });
}

export async function getOrCreateConversation(learnerId: string, providerProfileId: string, skill: string): Promise<string> {
  const { data: existing, error: existingError } = await supabase
    .from('conversations')
    .select('id')
    .eq('learner_id', learnerId)
    .eq('provider_id', providerProfileId)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);
  if (existing?.id) return existing.id;

  const { data, error } = await supabase
    .from('conversations')
    .insert({ learner_id: learnerId, provider_id: providerProfileId, related_skill: skill })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

export async function sendMessage(conversationId: string, senderId: string, content: string): Promise<Message> {
  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: senderId, content: content.trim() })
    .select(`id,conversation_id,sender_id,content,is_read,msg_type,created_at,sender:profiles!messages_sender_id_fkey(name,avatar_url)`)
    .single();
  if (error) throw new Error(error.message);
  const row = data as unknown as MessageRow;
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    senderName: row.sender?.name ?? 'You',
    senderAvatar: row.sender?.avatar_url ?? undefined,
    content: row.content,
    timestamp: row.created_at,
    isRead: row.is_read,
    type: row.msg_type,
  };
}

export async function markConversationRead(conversationId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('conversation_id', conversationId)
    .neq('sender_id', userId)
    .eq('is_read', false);
  if (error) throw new Error(error.message);
}