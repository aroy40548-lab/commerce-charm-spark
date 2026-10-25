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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          address1: string
          address2: string | null
          city: string
          country: string
          created_at: string
          full_name: string
          id: string
          is_default: boolean
          phone: string
          pincode: string
          state: string
          user_id: string
        }
        Insert: {
          address1?: string
          address2?: string | null
          city?: string
          country?: string
          created_at?: string
          full_name?: string
          id?: string
          is_default?: boolean
          phone?: string
          pincode?: string
          state?: string
          user_id: string
        }
        Update: {
          address1?: string
          address2?: string | null
          city?: string
          country?: string
          created_at?: string
          full_name?: string
          id?: string
          is_default?: boolean
          phone?: string
          pincode?: string
          state?: string
          user_id?: string
        }
        Relationships: []
      }
      affiliate_commissions: {
        Row: {
          affiliate_id: string
          amount: number
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: string
          note: string
          order_amount: number
          order_id: string
          paid_at: string | null
          rate: number
          status: string
        }
        Insert: {
          affiliate_id: string
          amount: number
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          note?: string
          order_amount: number
          order_id: string
          paid_at?: string | null
          rate: number
          status?: string
        }
        Update: {
          affiliate_id?: string
          amount?: number
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          note?: string
          order_amount?: number
          order_id?: string
          paid_at?: string | null
          rate?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_commissions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_commissions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliates: {
        Row: {
          clicks: number
          code: string
          commission_rate: number | null
          created_at: string
          email: string
          id: string
          name: string
          payout_upi: string | null
          status: string
          user_id: string
        }
        Insert: {
          clicks?: number
          code: string
          commission_rate?: number | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          payout_upi?: string | null
          status?: string
          user_id: string
        }
        Update: {
          clicks?: number
          code?: string
          commission_rate?: number | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          payout_upi?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author: string
          body: string
          cover_url: string | null
          created_at: string
          excerpt: string
          id: string
          published: boolean
          published_at: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          author?: string
          body?: string
          cover_url?: string | null
          created_at?: string
          excerpt?: string
          id?: string
          published?: boolean
          published_at?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          author?: string
          body?: string
          cover_url?: string | null
          created_at?: string
          excerpt?: string
          id?: string
          published?: boolean
          published_at?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string
          handle: string | null
          id: string
          image_url: string | null
          name: string
          position: number
        }
        Insert: {
          created_at?: string
          description?: string
          handle?: string | null
          id?: string
          image_url?: string | null
          name: string
          position?: number
        }
        Update: {
          created_at?: string
          description?: string
          handle?: string | null
          id?: string
          image_url?: string | null
          name?: string
          position?: number
        }
        Relationships: []
      }
      customer_notes: {
        Row: {
          note: string
          tags: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          note?: string
          tags?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          note?: string
          tags?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      discounts: {
        Row: {
          active: boolean
          code: string
          created_at: string
          description: string
          expires_at: string | null
          first_order_only: boolean
          id: string
          kind: string
          min_order: number
          once_per_customer: boolean
          starts_at: string | null
          usage_limit: number | null
          used_count: number
          value: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          description?: string
          expires_at?: string | null
          first_order_only?: boolean
          id?: string
          kind?: string
          min_order?: number
          once_per_customer?: boolean
          starts_at?: string | null
          usage_limit?: number | null
          used_count?: number
          value?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          description?: string
          expires_at?: string | null
          first_order_only?: boolean
          id?: string
          kind?: string
          min_order?: number
          once_per_customer?: boolean
          starts_at?: string | null
          usage_limit?: number | null
          used_count?: number
          value?: number
        }
        Relationships: []
      }
      gift_cards: {
        Row: {
          active: boolean
          balance: number
          code: string
          created_at: string
          customer_email: string | null
          expires_at: string | null
          id: string
          initial_value: number
          note: string
        }
        Insert: {
          active?: boolean
          balance: number
          code: string
          created_at?: string
          customer_email?: string | null
          expires_at?: string | null
          id?: string
          initial_value: number
          note?: string
        }
        Update: {
          active?: boolean
          balance?: number
          code?: string
          created_at?: string
          customer_email?: string | null
          expires_at?: string | null
          id?: string
          initial_value?: number
          note?: string
        }
        Relationships: []
      }
      inventory_adjustments: {
        Row: {
          actor: string | null
          created_at: string
          delta: number
          id: string
          reason: string
          stock_after: number
          variant_id: string
        }
        Insert: {
          actor?: string | null
          created_at?: string
          delta: number
          id?: string
          reason?: string
          stock_after: number
          variant_id: string
        }
        Update: {
          actor?: string | null
          created_at?: string
          delta?: number
          id?: string
          reason?: string
          stock_after?: number
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_adjustments_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_events: {
        Row: {
          actor: string | null
          created_at: string
          id: string
          kind: string
          message: string
          order_id: string
        }
        Insert: {
          actor?: string | null
          created_at?: string
          id?: string
          kind?: string
          message: string
          order_id: string
        }
        Update: {
          actor?: string | null
          created_at?: string
          id?: string
          kind?: string
          message?: string
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          image_url: string | null
          order_id: string
          price: number
          product_id: string | null
          quantity: number
          sku: string | null
          title: string
          variant_id: string | null
          variant_title: string | null
        }
        Insert: {
          id?: string
          image_url?: string | null
          order_id: string
          price: number
          product_id?: string | null
          quantity: number
          sku?: string | null
          title: string
          variant_id?: string | null
          variant_title?: string | null
        }
        Update: {
          id?: string
          image_url?: string | null
          order_id?: string
          price?: number
          product_id?: string | null
          quantity?: number
          sku?: string | null
          title?: string
          variant_id?: string | null
          variant_title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          affiliate_id: string | null
          awb_code: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          cod_fee: number
          courier_name: string | null
          created_at: string
          customer_name: string
          customer_note: string | null
          delivered_at: string | null
          discount: number
          discount_code: string | null
          email: string
          gift_card_amount: number
          gift_card_code: string | null
          id: string
          order_number: number
          paid_at: string | null
          payment_method: string
          phone: string
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          refund_id: string | null
          shipped_at: string | null
          shipping: number
          shipping_address: Json
          shipping_method: string
          shiprocket_order_id: string | null
          shiprocket_shipment_id: string | null
          source: string
          status: string
          stock_committed: boolean
          subtotal: number
          total: number
          tracking_status: string | null
          tracking_url: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          affiliate_id?: string | null
          awb_code?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          cod_fee?: number
          courier_name?: string | null
          created_at?: string
          customer_name?: string
          customer_note?: string | null
          delivered_at?: string | null
          discount?: number
          discount_code?: string | null
          email: string
          gift_card_amount?: number
          gift_card_code?: string | null
          id?: string
          order_number?: number
          paid_at?: string | null
          payment_method?: string
          phone?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          refund_id?: string | null
          shipped_at?: string | null
          shipping?: number
          shipping_address?: Json
          shipping_method?: string
          shiprocket_order_id?: string | null
          shiprocket_shipment_id?: string | null
          source?: string
          status?: string
          stock_committed?: boolean
          subtotal?: number
          total?: number
          tracking_status?: string | null
          tracking_url?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          affiliate_id?: string | null
          awb_code?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          cod_fee?: number
          courier_name?: string | null
          created_at?: string
          customer_name?: string
          customer_note?: string | null
          delivered_at?: string | null
          discount?: number
          discount_code?: string | null
          email?: string
          gift_card_amount?: number
          gift_card_code?: string | null
          id?: string
          order_number?: number
          paid_at?: string | null
          payment_method?: string
          phone?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          refund_id?: string | null
          shipped_at?: string | null
          shipping?: number
          shipping_address?: Json
          shipping_method?: string
          shiprocket_order_id?: string | null
          shiprocket_shipment_id?: string | null
          source?: string
          status?: string
          stock_committed?: boolean
          subtotal?: number
          total?: number
          tracking_status?: string | null
          tracking_url?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      product_images: {
        Row: {
          alt: string | null
          id: string
          position: number
          product_id: string
          url: string
        }
        Insert: {
          alt?: string | null
          id?: string
          position?: number
          product_id: string
          url: string
        }
        Update: {
          alt?: string | null
          id?: string
          position?: number
          product_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          admin_reply: string | null
          body: string
          created_at: string
          customer_id: string
          customer_name: string
          hidden: boolean
          id: string
          photo_paths: string[]
          product_handle: string
          rating: number
          replied_at: string | null
          shopify_product_id: string | null
          title: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_reply?: string | null
          body: string
          created_at?: string
          customer_id: string
          customer_name?: string
          hidden?: boolean
          id?: string
          photo_paths?: string[]
          product_handle: string
          rating: number
          replied_at?: string | null
          shopify_product_id?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_reply?: string | null
          body?: string
          created_at?: string
          customer_id?: string
          customer_name?: string
          hidden?: boolean
          id?: string
          photo_paths?: string[]
          product_handle?: string
          rating?: number
          replied_at?: string | null
          shopify_product_id?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      product_variants: {
        Row: {
          compare_at_price: number | null
          id: string
          position: number
          price: number | null
          product_id: string
          sku: string | null
          stock: number
          title: string
        }
        Insert: {
          compare_at_price?: number | null
          id?: string
          position?: number
          price?: number | null
          product_id: string
          sku?: string | null
          stock?: number
          title: string
        }
        Update: {
          compare_at_price?: number | null
          id?: string
          position?: number
          price?: number | null
          product_id?: string
          sku?: string | null
          stock?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          category_id: string | null
          compare_at_price: number | null
          created_at: string
          description: string
          handle: string
          id: string
          option_name: string
          price: number
          product_type: string
          seo_description: string | null
          seo_title: string | null
          status: string
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          category_id?: string | null
          compare_at_price?: number | null
          created_at?: string
          description?: string
          handle: string
          id?: string
          option_name?: string
          price?: number
          product_type?: string
          seo_description?: string | null
          seo_title?: string | null
          status?: string
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          category_id?: string | null
          compare_at_price?: number | null
          created_at?: string
          description?: string
          handle?: string
          id?: string
          option_name?: string
          price?: number
          product_type?: string
          seo_description?: string | null
          seo_title?: string | null
          status?: string
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          username: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          phone?: string | null
          username?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          username?: string | null
        }
        Relationships: []
      }
      shopify_wishlists: {
        Row: {
          created_at: string
          customer_id: string
          handle: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          handle: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          handle?: string
        }
        Relationships: []
      }
      staff_members: {
        Row: {
          active: boolean
          created_at: string
          email: string
          id: string
          invited_by: string | null
          last_seen_at: string | null
          name: string
          role_id: string | null
          user_id: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          email: string
          id?: string
          invited_by?: string | null
          last_seen_at?: string | null
          name?: string
          role_id?: string | null
          user_id?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string
          id?: string
          invited_by?: string | null
          last_seen_at?: string | null
          name?: string
          role_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_members_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "staff_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_roles: {
        Row: {
          created_at: string
          description: string
          id: string
          name: string
          permissions: string[]
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          name: string
          permissions?: string[]
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          name?: string
          permissions?: string[]
        }
        Relationships: []
      }
      store_settings: {
        Row: {
          affiliate_cookie_days: number
          affiliate_rate: number
          affiliates_enabled: boolean
          cod_enabled: boolean
          cod_fee: number
          express_enabled: boolean
          express_label: string
          express_shipping_fee: number
          free_shipping_over: number
          id: number
          low_stock_threshold: number
          package_weight_kg: number
          pickup_location: string
          razorpay_enabled: boolean
          shipping_fee: number
          standard_label: string
          store_name: string
          support_email: string
          updated_at: string
        }
        Insert: {
          affiliate_cookie_days?: number
          affiliate_rate?: number
          affiliates_enabled?: boolean
          cod_enabled?: boolean
          cod_fee?: number
          express_enabled?: boolean
          express_label?: string
          express_shipping_fee?: number
          free_shipping_over?: number
          id?: number
          low_stock_threshold?: number
          package_weight_kg?: number
          pickup_location?: string
          razorpay_enabled?: boolean
          shipping_fee?: number
          standard_label?: string
          store_name?: string
          support_email?: string
          updated_at?: string
        }
        Update: {
          affiliate_cookie_days?: number
          affiliate_rate?: number
          affiliates_enabled?: boolean
          cod_enabled?: boolean
          cod_fee?: number
          express_enabled?: boolean
          express_label?: string
          express_shipping_fee?: number
          free_shipping_over?: number
          id?: number
          low_stock_threshold?: number
          package_weight_kg?: number
          pickup_location?: string
          razorpay_enabled?: boolean
          shipping_fee?: number
          standard_label?: string
          store_name?: string
          support_email?: string
          updated_at?: string
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
      wishlists: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlists_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      adjust_stock: {
        Args: {
          _actor: string
          _delta: number
          _reason: string
          _variant_id: string
        }
        Returns: number
      }
      commit_order: {
        Args: { _order_id: string; _payment_id: string; _status: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      mark_order_paid: {
        Args: { _order_id: string; _payment_id: string }
        Returns: boolean
      }
      release_order: {
        Args: {
          _actor: string
          _order_id: string
          _reason: string
          _status: string
        }
        Returns: boolean
      }
      track_affiliate_click: { Args: { _code: string }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "staff" | "user"
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
      app_role: ["admin", "staff", "user"],
    },
  },
} as const
