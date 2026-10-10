export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_logs: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string
          details: string | null
          id: string
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string
          details?: string | null
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string
          details?: string | null
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      announcements: {
        Row: {
          active: boolean
          content: string
          created_at: string
          end_at: string | null
          icon: string
          id: string
          link_url: string | null
          start_at: string | null
          title: string
        }
        Insert: {
          active?: boolean
          content: string
          created_at?: string
          end_at?: string | null
          icon?: string
          id?: string
          link_url?: string | null
          start_at?: string | null
          title: string
        }
        Update: {
          active?: boolean
          content?: string
          created_at?: string
          end_at?: string | null
          icon?: string
          id?: string
          link_url?: string | null
          start_at?: string | null
          title?: string
        }
        Relationships: []
      }
      badges: {
        Row: {
          color: string
          created_at: string
          description: string | null
          icon: string
          id: string
          name: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          name: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          image_url: string | null
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          name?: string
          slug?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          script_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          script_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          script_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      key_checks: {
        Row: {
          created_at: string
          id: number
          ok: boolean
        }
        Insert: {
          created_at?: string
          id?: number
          ok: boolean
        }
        Update: {
          created_at?: string
          id?: number
          ok?: boolean
        }
        Relationships: []
      }
      key_requests: {
        Row: {
          started_at: string
          user_id: string
        }
        Insert: {
          started_at?: string
          user_id: string
        }
        Update: {
          started_at?: string
          user_id?: string
        }
        Relationships: []
      }
      key_settings: {
        Row: {
          enabled: boolean
          free_hours: number
          id: number
          premium_hours: number
          updated_at: string
          wait_seconds: number
        }
        Insert: {
          enabled?: boolean
          free_hours?: number
          id?: number
          premium_hours?: number
          updated_at?: string
          wait_seconds?: number
        }
        Update: {
          enabled?: boolean
          free_hours?: number
          id?: number
          premium_hours?: number
          updated_at?: string
          wait_seconds?: number
        }
        Relationships: []
      }
      license_keys: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          key: string
          key_type: string
          last_used_at: string | null
          max_uses: number | null
          notes: string | null
          user_id: string | null
          uses: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          key: string
          key_type?: string
          last_used_at?: string | null
          max_uses?: number | null
          notes?: string | null
          user_id?: string | null
          uses?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          key?: string
          key_type?: string
          last_used_at?: string | null
          max_uses?: number | null
          notes?: string | null
          user_id?: string | null
          uses?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          email: string | null
          id: string
          is_banned: boolean
          is_soft_banned: boolean
          ban_expires_at: string | null
          ban_reason: string | null
          is_disabled: boolean
          last_seen: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          id: string
          is_banned?: boolean
          is_soft_banned?: boolean
          ban_expires_at?: string | null
          ban_reason?: string | null
          is_disabled?: boolean
          last_seen?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_banned?: boolean
          is_disabled?: boolean
          last_seen?: string
          username?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          user_id: string;
          theme: string;
          email_notifications: boolean;
          public_profile: boolean;
          compact_layout: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          theme?: string;
          email_notifications?: boolean;
          public_profile?: boolean;
          compact_layout?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          theme?: string;
          email_notifications?: boolean;
          public_profile?: boolean;
          compact_layout?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      }
      script_comments: {
        Row: {
          id: string;
          script_id: string;
          user_id: string;
          content: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          script_id: string;
          user_id: string;
          content: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          script_id?: string;
          user_id?: string;
          content?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "script_comments_script_id_fkey";
            columns: ["script_id"];
            isOneToOne: false;
            referencedRelation: "scripts";
            referencedColumns: ["id"];
          }
        ];
      }
      script_collections: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          is_public: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      }
      script_collection_items: {
        Row: {
          collection_id: string;
          script_id: string;
          added_at: string;
        };
        Insert: {
          collection_id: string;
          script_id: string;
          added_at?: string;
        };
        Update: {
          collection_id?: string;
          script_id?: string;
          added_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "script_collection_items_collection_id_fkey";
            columns: ["collection_id"];
            isOneToOne: false;
            referencedRelation: "script_collections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "script_collection_items_script_id_fkey";
            columns: ["script_id"];
            isOneToOne: false;
            referencedRelation: "scripts";
            referencedColumns: ["id"];
          }
        ];
      }
      raw_scripts: {
        Row: {
          code: string
          created_at: string
          enabled: boolean
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          code?: string
          created_at?: string
          enabled?: boolean
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          enabled?: boolean
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          description: string | null
          id: string
          reason: string
          resolved_at: string | null
          script_id: string
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          reason: string
          resolved_at?: string | null
          script_id: string
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          reason?: string
          resolved_at?: string | null
          script_id?: string
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      script_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          script_id: string
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          script_id: string
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          script_id?: string
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "script_events_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      scripts: {
        Row: {
          archived: boolean
          category_id: string | null
          code: string
          copies: number
          created_at: string
          description: string | null
          download_enabled: boolean
          downloads: number
          favorites: number
          featured: boolean
          game_name: string
          id: string
          image_url: string | null
          name: string
          published: boolean
          raw_loader_url: string | null
          shares: number
          slug: string
          status: string
          tags: string[]
          updated_at: string
          verified: boolean
          version: string
          views: number
          youtube_url: string | null
        }
        Insert: {
          archived?: boolean
          category_id?: string | null
          code?: string
          copies?: number
          created_at?: string
          description?: string | null
          download_enabled?: boolean
          downloads?: number
          favorites?: number
          featured?: boolean
          game_name?: string
          id?: string
          image_url?: string | null
          name: string
          published?: boolean
          raw_loader_url?: string | null
          shares?: number
          slug: string
          status?: string
          tags?: string[]
          updated_at?: string
          verified?: boolean
          version?: string
          views?: number
          youtube_url?: string | null
        }
        Update: {
          archived?: boolean
          category_id?: string | null
          code?: string
          copies?: number
          created_at?: string
          description?: string | null
          download_enabled?: boolean
          downloads?: number
          favorites?: number
          featured?: boolean
          game_name?: string
          id?: string
          image_url?: string | null
          name?: string
          published?: boolean
          raw_loader_url?: string | null
          shares?: number
          slug?: string
          status?: string
          tags?: string[]
          updated_at?: string
          verified?: boolean
          version?: string
          views?: number
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scripts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          background_color: string | null
          color_mode: string
          custom_css: string | null
          description: string
          discord_url: string | null
          favicon_url: string | null
          hero_image_url: string | null
          homepage_sections: Json
          id: number
          logo_url: string | null
          maintenance_mode: boolean
          other_social_url: string | null
          registration_enabled: boolean
          site_name: string
          support_url: string | null
          telegram_url: string | null
          theme: string
          updated_at: string
          youtube_url: string | null
        }
        Insert: {
          background_color?: string | null
          color_mode?: string
          custom_css?: string | null
          description?: string
          discord_url?: string | null
          favicon_url?: string | null
          hero_image_url?: string | null
          homepage_sections?: Json
          id?: number
          logo_url?: string | null
          maintenance_mode?: boolean
          other_social_url?: string | null
          registration_enabled?: boolean
          site_name?: string
          support_url?: string | null
          telegram_url?: string | null
          theme?: string
          updated_at?: string
          youtube_url?: string | null
        }
        Update: {
          background_color?: string | null
          color_mode?: string
          custom_css?: string | null
          description?: string
          discord_url?: string | null
          favicon_url?: string | null
          hero_image_url?: string | null
          homepage_sections?: Json
          id?: number
          logo_url?: string | null
          maintenance_mode?: boolean
          other_social_url?: string | null
          registration_enabled?: boolean
          site_name?: string
          support_url?: string | null
          telegram_url?: string | null
          theme?: string
          updated_at?: string
          youtube_url?: string | null
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          assigned_by: string | null
          badge_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          badge_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          badge_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_generate_keys: {
        Args: {
          _count: number
          _hours: number
          _max_uses: number
          _notes: string
          _type: string
          _user: string
        }
        Returns: {
          active: boolean
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          key: string
          key_type: string
          last_used_at: string | null
          max_uses: number | null
          notes: string | null
          user_id: string | null
          uses: number
        }[]
        SetofOptions: {
          from: "*"
          to: "license_keys"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_key_stats: { Args: never; Returns: Json }
      admin_overview: { Args: never; Returns: Json }
      admin_stats: { Args: never; Returns: Json }
      admin_timeseries: {
        Args: { _days?: number }
        Returns: {
          copies: number
          day: string
          downloads: number
          new_scripts: number
          new_users: number
          views: number
        }[]
      }
      claim_free_key: { Args: never; Returns: Json }
      get_raw_script: { Args: { _slug: string; _user_agent?: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      new_key_text: { Args: never; Returns: string }
      record_script_event: {
        Args: { _event_type: string; _script_id: string; _session_id?: string }
        Returns: undefined
      }
      script_analytics: { Args: { _script_id: string }; Returns: Json }
      site_stats: { Args: never; Returns: Json }
      start_key_request: { Args: never; Returns: number }
      touch_presence: { Args: never; Returns: undefined }
      trending_scripts: {
        Args: { _limit?: number }
        Returns: {
          archived: boolean
          category_id: string | null
          code: string
          copies: number
          created_at: string
          description: string | null
          download_enabled: boolean
          downloads: number
          favorites: number
          featured: boolean
          game_name: string
          id: string
          image_url: string | null
          name: string
          published: boolean
          raw_loader_url: string | null
          shares: number
          slug: string
          status: string
          tags: string[]
          updated_at: string
          verified: boolean
          version: string
          views: number
          youtube_url: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "scripts"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      validate_key: { Args: { _key: string }; Returns: Json }
    }
    Enums: {
      app_role: "user" | "moderator" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["user", "moderator", "admin"],
    },
  },
} as const
