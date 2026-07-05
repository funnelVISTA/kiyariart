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
      admin_activity_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_user_id: string | null
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_title: string | null
          entity_type: string
          id: string
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_user_id?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_title?: string | null
          entity_type?: string
          id?: string
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_user_id?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_title?: string | null
          entity_type?: string
          id?: string
        }
        Relationships: []
      }
      artwork_display_order: {
        Row: {
          artwork_id: string
          position: number
          updated_at: string
        }
        Insert: {
          artwork_id: string
          position?: number
          updated_at?: string
        }
        Update: {
          artwork_id?: string
          position?: number
          updated_at?: string
        }
        Relationships: []
      }
      artwork_stock: {
        Row: {
          artwork_id: string
          sold_units: number
          total_units: number
          updated_at: string
        }
        Insert: {
          artwork_id: string
          sold_units?: number
          total_units?: number
          updated_at?: string
        }
        Update: {
          artwork_id?: string
          sold_units?: number
          total_units?: number
          updated_at?: string
        }
        Relationships: []
      }
      artworks_custom: {
        Row: {
          alt_text: string | null
          collection: string
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number
          id: string
          image_url: string
          medium: string | null
          price: number
          seo_description: string | null
          seo_title: string | null
          sold: boolean
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          alt_text?: string | null
          collection?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          id?: string
          image_url: string
          medium?: string | null
          price?: number
          seo_description?: string | null
          seo_title?: string | null
          sold?: boolean
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          alt_text?: string | null
          collection?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string
          medium?: string | null
          price?: number
          seo_description?: string | null
          seo_title?: string | null
          sold?: boolean
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      exhibitions: {
        Row: {
          blurb: string | null
          city: string | null
          created_at: string
          created_by: string | null
          end_date: string | null
          event_date: string | null
          id: string
          image_url: string | null
          link_url: string | null
          sort_order: number
          status: string
          time_text: string | null
          title: string
          updated_at: string
          venue: string | null
        }
        Insert: {
          blurb?: string | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          event_date?: string | null
          id?: string
          image_url?: string | null
          link_url?: string | null
          sort_order?: number
          status?: string
          time_text?: string | null
          title: string
          updated_at?: string
          venue?: string | null
        }
        Update: {
          blurb?: string | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          event_date?: string | null
          id?: string
          image_url?: string | null
          link_url?: string | null
          sort_order?: number
          status?: string
          time_text?: string | null
          title?: string
          updated_at?: string
          venue?: string | null
        }
        Relationships: []
      }
      orders: {
        Row: {
          amount_total_cad: number | null
          created_at: string
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          delivered_at: string | null
          id: string
          items: Json
          marketing_opt_in: boolean
          notes: string | null
          payment_intent_id: string | null
          shipped_at: string | null
          shipping_address: string | null
          status: Database["public"]["Enums"]["order_status"]
          stripe_session_id: string | null
          total_cad: number
          tracking_carrier: string | null
          tracking_number: string | null
          tracking_url: string | null
          updated_at: string
        }
        Insert: {
          amount_total_cad?: number | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivered_at?: string | null
          id?: string
          items?: Json
          marketing_opt_in?: boolean
          notes?: string | null
          payment_intent_id?: string | null
          shipped_at?: string | null
          shipping_address?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          stripe_session_id?: string | null
          total_cad?: number
          tracking_carrier?: string | null
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
        }
        Update: {
          amount_total_cad?: number | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivered_at?: string | null
          id?: string
          items?: Json
          marketing_opt_in?: boolean
          notes?: string | null
          payment_intent_id?: string | null
          shipped_at?: string | null
          shipping_address?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          stripe_session_id?: string | null
          total_cad?: number
          tracking_carrier?: string | null
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sold_artworks: {
        Row: {
          artwork_id: string
          order_id: string | null
          sold_at: string
        }
        Insert: {
          artwork_id: string
          order_id?: string | null
          sold_at?: string
        }
        Update: {
          artwork_id?: string
          order_id?: string | null
          sold_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sold_artworks_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      subscribers: {
        Row: {
          confirmed: boolean
          created_at: string
          email: string
          id: string
          name: string | null
          source: string | null
          updated_at: string
        }
        Insert: {
          confirmed?: boolean
          created_at?: string
          email: string
          id?: string
          name?: string | null
          source?: string | null
          updated_at?: string
        }
        Update: {
          confirmed?: boolean
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          source?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
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
      decrement_artwork_stock: {
        Args: { _artwork_id: string; _qty: number }
        Returns: boolean
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user"
      order_status: "pending" | "paid" | "shipped" | "delivered" | "cancelled"
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
      app_role: ["admin", "user"],
      order_status: ["pending", "paid", "shipped", "delivered", "cancelled"],
    },
  },
} as const
