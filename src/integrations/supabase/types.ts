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
      account_actions: {
        Row: {
          actor: string
          created_at: string
          id: string
          reason: string
          status: string
          user_id: string
        }
        Insert: {
          actor: string
          created_at?: string
          id?: string
          reason?: string
          status: string
          user_id: string
        }
        Update: {
          actor?: string
          created_at?: string
          id?: string
          reason?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
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
          product_ids: string[]
          rate: number
          reel_id: string | null
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
          product_ids?: string[]
          rate: number
          reel_id?: string | null
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
          product_ids?: string[]
          rate?: number
          reel_id?: string | null
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
      announcements: {
        Row: {
          body: string
          created_at: string
          deleted_at: string | null
          id: string
          sent_by: string | null
          sent_count: number
        }
        Insert: {
          body: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          sent_by?: string | null
          sent_count?: number
        }
        Update: {
          body?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          sent_by?: string | null
          sent_count?: number
        }
        Relationships: []
      }
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
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
      conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          user_a: string
          user_b: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          user_a: string
          user_b: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          user_a?: string
          user_b?: string
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
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
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
      message_reports: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          reason: string
          reporter_id: string
          status: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          reason?: string
          reporter_id: string
          status?: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          reason?: string
          reporter_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reports_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          image_path: string | null
          read_at: string | null
          sender_id: string
          shared: Json | null
        }
        Insert: {
          body?: string
          conversation_id: string
          created_at?: string
          id?: string
          image_path?: string | null
          read_at?: string | null
          sender_id: string
          shared?: Json | null
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          image_path?: string | null
          read_at?: string | null
          sender_id?: string
          shared?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          announcement_id: string | null
          body: string
          created_at: string
          id: string
          kind: string
          post_id: string | null
          read_at: string | null
          reel_id: string | null
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          announcement_id?: string | null
          body?: string
          created_at?: string
          id?: string
          kind: string
          post_id?: string | null
          read_at?: string | null
          reel_id?: string | null
          user_id: string
        }
        Update: {
          actor_id?: string | null
          announcement_id?: string | null
          body?: string
          created_at?: string
          id?: string
          kind?: string
          post_id?: string | null
          read_at?: string | null
          reel_id?: string | null
          user_id?: string
        }
        Relationships: []
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
          affiliate_product_ids: string[]
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
          reel_id: string | null
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
          affiliate_product_ids?: string[]
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
          reel_id?: string | null
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
          affiliate_product_ids?: string[]
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
          reel_id?: string | null
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
      post_comments: {
        Row: {
          body: string
          created_at: string
          hidden: boolean
          id: string
          parent_id: string | null
          post_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          hidden?: boolean
          id?: string
          parent_id?: string | null
          post_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          hidden?: boolean
          id?: string
          parent_id?: string | null
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_media: {
        Row: {
          height: number
          id: string
          path: string
          position: number
          post_id: string
          thumb_path: string
          width: number
        }
        Insert: {
          height?: number
          id?: string
          path: string
          position?: number
          post_id: string
          thumb_path: string
          width?: number
        }
        Update: {
          height?: number
          id?: string
          path?: string
          position?: number
          post_id?: string
          thumb_path?: string
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "post_media_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_products: {
        Row: {
          position: number
          post_id: string
          product_id: string
        }
        Insert: {
          position?: number
          post_id: string
          product_id: string
        }
        Update: {
          position?: number
          post_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_products_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          caption: string
          created_at: string
          id: string
          priority: number
          status: string
          user_id: string
        }
        Insert: {
          caption?: string
          created_at?: string
          id?: string
          priority?: number
          status?: string
          user_id: string
        }
        Update: {
          caption?: string
          created_at?: string
          id?: string
          priority?: number
          status?: string
          user_id?: string
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
          paired_product_ids: string[]
          price: number
          product_type: string
          seo_description: string | null
          seo_title: string | null
          size_chart: Json | null
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
          paired_product_ids?: string[]
          price?: number
          product_type?: string
          seo_description?: string | null
          seo_title?: string | null
          size_chart?: Json | null
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
          paired_product_ids?: string[]
          price?: number
          product_type?: string
          seo_description?: string | null
          seo_title?: string | null
          size_chart?: Json | null
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
          account_status: string
          avatar_path: string | null
          bio: string
          created_at: string
          dm_followers_only: boolean
          email: string | null
          feed_priority: number
          first_name: string | null
          full_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          status_changed_at: string | null
          status_changed_by: string | null
          status_reason: string | null
          username: string | null
          verified: boolean
          verified_at: string | null
        }
        Insert: {
          account_status?: string
          avatar_path?: string | null
          bio?: string
          created_at?: string
          dm_followers_only?: boolean
          email?: string | null
          feed_priority?: number
          first_name?: string | null
          full_name?: string | null
          id: string
          last_name?: string | null
          phone?: string | null
          status_changed_at?: string | null
          status_changed_by?: string | null
          status_reason?: string | null
          username?: string | null
          verified?: boolean
          verified_at?: string | null
        }
        Update: {
          account_status?: string
          avatar_path?: string | null
          bio?: string
          created_at?: string
          dm_followers_only?: boolean
          email?: string | null
          feed_priority?: number
          first_name?: string | null
          full_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          status_changed_at?: string | null
          status_changed_by?: string | null
          status_reason?: string | null
          username?: string | null
          verified?: boolean
          verified_at?: string | null
        }
        Relationships: []
      }
      reel_comments: {
        Row: {
          body: string
          created_at: string
          hidden: boolean
          id: string
          parent_id: string | null
          reel_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          hidden?: boolean
          id?: string
          parent_id?: string | null
          reel_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          hidden?: boolean
          id?: string
          parent_id?: string | null
          reel_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reel_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "reel_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reel_comments_reel_id_fkey"
            columns: ["reel_id"]
            isOneToOne: false
            referencedRelation: "reels"
            referencedColumns: ["id"]
          },
        ]
      }
      reel_products: {
        Row: {
          position: number
          product_id: string
          reel_id: string
        }
        Insert: {
          position?: number
          product_id: string
          reel_id: string
        }
        Update: {
          position?: number
          product_id?: string
          reel_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reel_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reel_products_reel_id_fkey"
            columns: ["reel_id"]
            isOneToOne: false
            referencedRelation: "reels"
            referencedColumns: ["id"]
          },
        ]
      }
      reel_views: {
        Row: {
          created_at: string
          reel_id: string
          viewer: string
        }
        Insert: {
          created_at?: string
          reel_id: string
          viewer: string
        }
        Update: {
          created_at?: string
          reel_id?: string
          viewer?: string
        }
        Relationships: [
          {
            foreignKeyName: "reel_views_reel_id_fkey"
            columns: ["reel_id"]
            isOneToOne: false
            referencedRelation: "reels"
            referencedColumns: ["id"]
          },
        ]
      }
      reel_votes: {
        Row: {
          created_at: string
          reel_id: string
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string
          reel_id: string
          user_id: string
          value: number
        }
        Update: {
          created_at?: string
          reel_id?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "reel_votes_reel_id_fkey"
            columns: ["reel_id"]
            isOneToOne: false
            referencedRelation: "reels"
            referencedColumns: ["id"]
          },
        ]
      }
      reels: {
        Row: {
          caption: string
          created_at: string
          duration: number
          id: string
          priority: number
          status: string
          user_id: string
          video_path: string
          views: number
        }
        Insert: {
          caption?: string
          created_at?: string
          duration?: number
          id?: string
          priority?: number
          status?: string
          user_id: string
          video_path: string
          views?: number
        }
        Update: {
          caption?: string
          created_at?: string
          duration?: number
          id?: string
          priority?: number
          status?: string
          user_id?: string
          video_path?: string
          views?: number
        }
        Relationships: []
      }
      saves: {
        Row: {
          created_at: string
          item_id: string
          kind: string
          user_id: string
        }
        Insert: {
          created_at?: string
          item_id: string
          kind: string
          user_id: string
        }
        Update: {
          created_at?: string
          item_id?: string
          kind?: string
          user_id?: string
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
          android_apk_path: string | null
          android_apk_url: string | null
          android_notes: string | null
          android_version: string | null
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
          android_apk_path?: string | null
          android_apk_url?: string | null
          android_notes?: string | null
          android_version?: string | null
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
          android_apk_path?: string | null
          android_apk_url?: string | null
          android_notes?: string | null
          android_version?: string | null
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
      user_nudges: {
        Row: {
          body: string
          created_at: string
          id: string
          link: string | null
          seen_at: string | null
          sent_by: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          link?: string | null
          seen_at?: string | null
          sent_by?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          link?: string | null
          seen_at?: string | null
          sent_by?: string
          user_id?: string
        }
        Relationships: []
      }
      user_presence: {
        Row: {
          cart_count: number
          cart_items: Json
          cart_value: number
          device: string
          first_seen_at: string
          last_seen_at: string
          path: string
          session_started_at: string
          user_id: string
          visits: number
        }
        Insert: {
          cart_count?: number
          cart_items?: Json
          cart_value?: number
          device?: string
          first_seen_at?: string
          last_seen_at?: string
          path?: string
          session_started_at?: string
          user_id: string
          visits?: number
        }
        Update: {
          cart_count?: number
          cart_items?: Json
          cart_value?: number
          device?: string
          first_seen_at?: string
          last_seen_at?: string
          path?: string
          session_started_at?: string
          user_id?: string
          visits?: number
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
      affiliate_commission_base: {
        Args: { _order_id: string }
        Returns: number
      }
      broadcast_notification: { Args: { _body: string }; Returns: number }
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
      increment_reel_views: { Args: { _reel_id: string }; Returns: undefined }
      mark_order_paid: {
        Args: { _order_id: string; _payment_id: string }
        Returns: boolean
      }
      notify: {
        Args: {
          _actor: string
          _body: string
          _kind: string
          _post: string
          _reel: string
          _user: string
        }
        Returns: undefined
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
      send_announcement: { Args: { _id: string }; Returns: number }
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
