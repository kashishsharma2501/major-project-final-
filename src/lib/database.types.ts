/**
 * Hand-written database type definitions for SkillShare Local — Phase 2A-1.
 *
 * These mirror the SQL schema in supabase/migrations/001_profiles.sql.
 * Once the Supabase CLI is wired to the project you can regenerate this file
 * with: `supabase gen types typescript --local > src/lib/database.types.ts`
 *
 * Until then these types are maintained by hand and must stay in sync with
 * the migration files.
 */

export type UserRole = 'learner' | 'provider' | 'admin';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type SavedItemType = 'provider' | 'skill';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;                    // uuid — matches auth.users(id)
          name: string;
          email: string;
          avatar_url: string | null;
          city: string;
          bio: string | null;
          languages: string[];
          role: UserRole;
          is_verified: boolean;
          onboarding_complete: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          email: string;
          avatar_url?: string | null;
          city?: string;
          bio?: string | null;
          languages?: string[];
          role?: UserRole;
          is_verified?: boolean;
          onboarding_complete?: boolean;
        };
        Update: {
          name?: string;
          avatar_url?: string | null;
          city?: string;
          bio?: string | null;
          languages?: string[];
          onboarding_complete?: boolean;
          // role is intentionally excluded — must go through set_user_role() RPC
        };
      };
      skill_catalogue: {
        Row: {
          id: string;
          name: string;
          field: string;
          category: string;
          icon: string;
          description: string;
          evidence_status: 'verified' | 'needs_validation';
          evidence_summary: string;
          evidence_type: 'job_market' | 'training' | 'job_and_training';
          example_orgs: string[];
          source_label: string;
          source_url: string;
          popularity_rank: number;
          is_active: boolean;
          is_featured: boolean;
          tags: string[];
          research_date: string;
          created_at: string;
        };
        Insert: never;
        Update: never;
      };
      saved_items: {
        Row: {
          id: string;
          user_id: string;
          item_type: SavedItemType;
          provider_id: string | null;
          skill_id: string | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          item_type: SavedItemType;
          provider_id?: string | null;
          skill_id?: string | null;
        };
        Update: never;
      };
    };
    Functions: {
      set_user_role: {
        Args: { target_id: string; new_role: UserRole };
        Returns: void;
      };
      set_provider_approval: {
        Args: { p_provider_id: string; p_status: ApprovalStatus; p_rejection_note?: string };
        Returns: void;
      };
      set_provider_skill_approval: {
        Args: { p_skill_id: string; p_status: ApprovalStatus; p_rejection_note?: string | null };
        Returns: void;
      };
    };
    Enums: {
      user_role: UserRole;
      approval_status: ApprovalStatus;
      saved_item_type: SavedItemType;
    };
  };
}
