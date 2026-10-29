// ─── Core Enums ──────────────────────────────────────────────────────────────

export type UserRole = 'learner' | 'provider' | 'both' | 'admin';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
export type LearningMode = 'offline' | 'online' | 'either';
export type BookingStatus = 'pending' | 'accepted' | 'completed' | 'cancelled' | 'declined';
export type SessionStatus = 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
export type NotificationType = 'booking_request' | 'booking_accepted' | 'booking_declined' | 'new_message' | 'session_reminder' | 'new_review' | 'system';

// ─── User ─────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  location: string;
  city: string;
  role: UserRole;
  joinedAt: string;
  isVerified: boolean;
  bio?: string;
  languages?: string[];
}

// ─── Skill ────────────────────────────────────────────────────────────────────

export interface Skill {
  id: string;
  name: string;
  category: string;
  icon: string;
  description: string;
  popularityRank: number;
}

export interface SkillCategory {
  id: string;
  name: string;
  icon: string;
  count: number;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  type: 'image' | 'project' | 'certificate';
}

export interface ProviderSkill {
  skillId: string;
  skillName: string;
  category: string;
  experienceLevel: ExperienceLevel;
  yearsOfExperience: number;
  pricePerSession: number;
  sessionDurationMinutes: number;
  learningMode: LearningMode;
  description: string;
}

export interface Availability {
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  slots: string[]; // e.g., ['09:00', '10:00', '14:00']
}

export interface Provider {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatar?: string;
  location: string;
  city: string;
  distanceKm: number | null;
  bio: string;
  skills: ProviderSkill[];
  primarySkill: string;
  primaryCategory: string;
  rating: number;
  reviewCount: number;
  totalSessions: number;
  totalStudents: number;
  yearsTeaching: number;
  responseTimeMinutes: number;
  isVerified: boolean;
  isOnline: boolean;
  badges: ProviderBadge[];
  portfolio: PortfolioItem[];
  availability: Availability[];
  languages: string[];
  joinedAt: string;
  matchScore?: number;
}

export type ProviderBadge = 'top_rated' | 'reliable' | 'highly_recommended' | 'new_provider' | 'expert';

// ─── Booking ──────────────────────────────────────────────────────────────────

export interface Booking {
  id: string;
  learnerId: string;
  learnerName: string;
  learnerAvatar?: string;
  providerId: string;
  providerName: string;
  providerAvatar?: string;
  skill: string;
  skillCategory: string;
  date: string; // ISO date string
  time: string; // e.g., '15:00'
  durationMinutes: number;
  mode: LearningMode;
  location?: string;
  price: number;
  status: BookingStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Review ───────────────────────────────────────────────────────────────────

export interface Review {
  id: string;
  bookingId: string;
  learnerId: string;
  learnerName: string;
  learnerAvatar?: string;
  providerId: string;
  providerName: string;
  rating: number;
  comment: string;
  skillTaught: string;
  createdAt: string;
  isVerified: boolean;
}

// ─── Message ──────────────────────────────────────────────────────────────────

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  timestamp: string;
  isRead: boolean;
  type: 'text' | 'booking_context' | 'system';
}

export interface Conversation {
  id: string;
  /** The user id who owns this conversation thread (the learner or provider side). */
  ownerId: string;
  participantId: string;
  participantName: string;
  participantAvatar?: string;
  participantRole: 'learner' | 'provider';
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isOnline: boolean;
  relatedSkill?: string;
  messages: Message[];
}

// ─── Notification ─────────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  /** The user id this notification belongs to. */
  recipientId: string;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  timestamp: string;
  actionUrl?: string;
  avatarUrl?: string;
  actorName?: string;
}

// ─── Auth / Session ───────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: UserRole;
  city: string;
  bio?: string;
  languages?: string[];
  isAuthenticated: boolean;
}

// ─── Onboarding ───────────────────────────────────────────────────────────────

export interface OnboardingData {
  intent: 'learn' | 'teach' | 'both' | null;
  selectedSkills: string[];
  experienceLevel: ExperienceLevel | null;
  learningMode: LearningMode | null;
  preferredDistance: number | null;
  availability: Availability[];
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export interface AdminStats {
  totalUsers: number;
  activeProviders: number;
  totalBookings: number;
  averageRating: number;
  newUsersThisWeek: number;
  bookingsThisWeek: number;
  revenueThisMonth: number;
  pendingVerifications: number;
}
