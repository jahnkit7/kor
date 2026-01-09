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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      clients: {
        Row: {
          created_at: string
          id: string
          is_risky: boolean | null
          name: string
          phone: string
          photo: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_risky?: boolean | null
          name: string
          phone: string
          photo?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_risky?: boolean | null
          name?: string
          phone?: string
          photo?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      commissions: {
        Row: {
          applies_to: string
          country_id: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          type: string
          updated_at: string
          value: number
        }
        Insert: {
          applies_to: string
          country_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          type: string
          updated_at?: string
          value: number
        }
        Update: {
          applies_to?: string
          country_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          type?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "commissions_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      countries: {
        Row: {
          code: string
          created_at: string
          currency: string
          id: string
          is_active: boolean
          name: string
          phone_prefix: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          name: string
          phone_prefix: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          name?: string
          phone_prefix?: string
          updated_at?: string
        }
        Relationships: []
      }
      debts: {
        Row: {
          amount: number
          client_id: string
          created_at: string
          id: string
          paid: number
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          client_id: string
          created_at?: string
          id?: string
          paid?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          client_id?: string
          created_at?: string
          id?: string
          paid?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "debts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_invites: {
        Row: {
          created_at: string
          employee_phone: string
          expires_at: string
          id: string
          invite_code: string | null
          owner_user_id: string
          status: string
        }
        Insert: {
          created_at?: string
          employee_phone: string
          expires_at?: string
          id?: string
          invite_code?: string | null
          owner_user_id: string
          status?: string
        }
        Update: {
          created_at?: string
          employee_phone?: string
          expires_at?: string
          id?: string
          invite_code?: string | null
          owner_user_id?: string
          status?: string
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          created_at: string
          depends_on: string[] | null
          description: string | null
          disabled_countries: string[] | null
          enabled_for_users: string[] | null
          feature_key: string
          id: string
          is_globally_enabled: boolean
          min_plan_required: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          depends_on?: string[] | null
          description?: string | null
          disabled_countries?: string[] | null
          enabled_for_users?: string[] | null
          feature_key: string
          id?: string
          is_globally_enabled?: boolean
          min_plan_required?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          depends_on?: string[] | null
          description?: string | null
          disabled_countries?: string[] | null
          enabled_for_users?: string[] | null
          feature_key?: string
          id?: string
          is_globally_enabled?: boolean
          min_plan_required?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      feature_usage: {
        Row: {
          action: string
          created_at: string
          feature_key: string
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          action?: string
          created_at?: string
          feature_key: string
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          feature_key?: string
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      merchant_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean
          receiver_id: string
          request_id: string | null
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          receiver_id: string
          request_id?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          receiver_id?: string
          request_id?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "product_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_negotiations: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          offer_id: string | null
          product_name: string
          proposed_price: number | null
          proposed_quantity: number | null
          proposed_total: number | null
          proposed_unit: string | null
          proposer_id: string
          request_id: string | null
          responder_id: string
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          offer_id?: string | null
          product_name: string
          proposed_price?: number | null
          proposed_quantity?: number | null
          proposed_total?: number | null
          proposed_unit?: string | null
          proposer_id: string
          request_id?: string | null
          responder_id: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          offer_id?: string | null
          product_name?: string
          proposed_price?: number | null
          proposed_quantity?: number | null
          proposed_total?: number | null
          proposed_unit?: string | null
          proposer_id?: string
          request_id?: string | null
          responder_id?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_negotiations_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "merchant_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_negotiations_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "product_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_offers: {
        Row: {
          created_at: string | null
          description: string | null
          expires_at: string | null
          id: string
          is_promo: boolean | null
          price: number | null
          product_name: string
          promo_label: string | null
          quantity: number | null
          status: string | null
          unit: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_promo?: boolean | null
          price?: number | null
          product_name: string
          promo_label?: string | null
          quantity?: number | null
          status?: string | null
          unit?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_promo?: boolean | null
          price?: number | null
          product_name?: string
          promo_label?: string | null
          quantity?: number | null
          status?: string | null
          unit?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      merchant_profiles: {
        Row: {
          created_at: string
          id: string
          is_visible: boolean
          location_lat: number | null
          location_lng: number | null
          location_name: string | null
          market_address: string | null
          merchant_type: string
          specialties: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_visible?: boolean
          location_lat?: number | null
          location_lng?: number | null
          location_name?: string | null
          market_address?: string | null
          merchant_type?: string
          specialties?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_visible?: boolean
          location_lat?: number | null
          location_lng?: number | null
          location_name?: string | null
          market_address?: string | null
          merchant_type?: string
          specialties?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          client_id: string
          created_at: string
          debt_id: string
          id: string
          user_id: string
        }
        Insert: {
          amount: number
          client_id: string
          created_at?: string
          debt_id: string
          id?: string
          user_id: string
        }
        Update: {
          amount?: number
          client_id?: string
          created_at?: string
          debt_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_debt_id_fkey"
            columns: ["debt_id"]
            isOneToOne: false
            referencedRelation: "debts"
            referencedColumns: ["id"]
          },
        ]
      }
      product_requests: {
        Row: {
          created_at: string
          expires_at: string
          fulfilled_by: string | null
          id: string
          max_price: number | null
          notes: string | null
          product_name: string
          quantity: number | null
          raw_transcript: string | null
          status: string
          unit: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          fulfilled_by?: string | null
          id?: string
          max_price?: number | null
          notes?: string | null
          product_name: string
          quantity?: number | null
          raw_transcript?: string | null
          status?: string
          unit?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          fulfilled_by?: string | null
          id?: string
          max_price?: number | null
          notes?: string | null
          product_name?: string
          quantity?: number | null
          raw_transcript?: string | null
          status?: string
          unit?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          app_pin: string | null
          auto_lock_minutes: number | null
          created_at: string
          currency: string
          hide_amounts: boolean | null
          id: string
          language: string
          linked_owner_id: string | null
          onboarding_completed: boolean | null
          owner_name: string | null
          phone: string | null
          shop_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          app_pin?: string | null
          auto_lock_minutes?: number | null
          created_at?: string
          currency?: string
          hide_amounts?: boolean | null
          id?: string
          language?: string
          linked_owner_id?: string | null
          onboarding_completed?: boolean | null
          owner_name?: string | null
          phone?: string | null
          shop_name?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          app_pin?: string | null
          auto_lock_minutes?: number | null
          created_at?: string
          currency?: string
          hide_amounts?: boolean | null
          id?: string
          language?: string
          linked_owner_id?: string | null
          onboarding_completed?: boolean | null
          owner_name?: string | null
          phone?: string | null
          shop_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recharge_codes: {
        Row: {
          batch_name: string | null
          code: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          is_used: boolean
          plan_id: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          batch_name?: string | null
          code: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          is_used?: boolean
          plan_id: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          batch_name?: string | null
          code?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          is_used?: boolean
          plan_id?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recharge_codes_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      regions: {
        Row: {
          country_id: string
          created_at: string
          id: string
          is_active: boolean
          launch_date: string | null
          name: string
          updated_at: string
        }
        Insert: {
          country_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          launch_date?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          country_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          launch_date?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "regions_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          amount: number
          client_id: string | null
          created_at: string
          id: string
          note: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          client_id?: string | null
          created_at?: string
          id?: string
          note?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          client_id?: string | null
          created_at?: string
          id?: string
          note?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_items: {
        Row: {
          created_at: string
          id: string
          model: string | null
          name: string
          quantity: number
          source: string | null
          unit_price: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          model?: string | null
          name: string
          quantity?: number
          source?: string | null
          unit_price?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          model?: string | null
          name?: string
          quantity?: number
          source?: string | null
          unit_price?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      stock_voice_entries: {
        Row: {
          created_at: string
          error: string | null
          id: string
          parsed_items: Json | null
          raw_transcript: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          parsed_items?: Json | null
          raw_transcript: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          parsed_items?: Json | null
          raw_transcript?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          country_id: string | null
          created_at: string
          currency: string
          description: string | null
          duration_days: number
          features: Json
          id: string
          is_active: boolean
          max_clients: number | null
          max_sales_per_day: number | null
          name: string
          price: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          country_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          duration_days: number
          features?: Json
          id?: string
          is_active?: boolean
          max_clients?: number | null
          max_sales_per_day?: number | null
          name: string
          price: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          country_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          duration_days?: number
          features?: Json
          id?: string
          is_active?: boolean
          max_clients?: number | null
          max_sales_per_day?: number | null
          name?: string
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_plans_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          max_clients: number | null
          plan: string
          trial_ends_at: string
          trial_started_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          max_clients?: number | null
          plan?: string
          trial_ends_at?: string
          trial_started_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          max_clients?: number | null
          plan?: string
          trial_ends_at?: string
          trial_started_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          created_at: string
          id: string
          messages: Json
          priority: string
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          id?: string
          messages?: Json
          priority?: string
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          id?: string
          messages?: Json
          priority?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          role?: Database["public"]["Enums"]["app_role"]
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
      get_trust_score_data: { Args: { target_user_id: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "owner" | "employee" | "admin"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: ["owner", "employee", "admin"],
    },
  },
} as const
