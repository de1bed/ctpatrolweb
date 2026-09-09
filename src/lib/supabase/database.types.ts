// ============================================================================
// GENERADO AUTOMÁTICAMENTE — NO EDITAR A MANO
//
// Regenerar con:  npm run db:types
//
// Este archivo es el contrato entre Postgres y TypeScript. Si alguien agrega
// una columna y no regenera, el compilador lo caza antes que el usuario.
// ============================================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      company_accounts: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          settings: Json
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          settings?: Json
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          settings?: Json
          updated_at?: string
        }
        Relationships: []
      }
      containers: {
        Row: {
          company_account_id: string
          created_at: string
          created_by: string | null
          customer_id: string | null
          id: string
          is_active: boolean
          is_ephemeral: boolean
          number: string
          plates: string | null
          plates_state: string | null
          size: string | null
          updated_at: string
        }
        Insert: {
          company_account_id: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          id?: string
          is_active?: boolean
          is_ephemeral?: boolean
          number: string
          plates?: string | null
          plates_state?: string | null
          size?: string | null
          updated_at?: string
        }
        Update: {
          company_account_id?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          id?: string
          is_active?: boolean
          is_ephemeral?: boolean
          number?: string
          plates?: string | null
          plates_state?: string | null
          size?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "containers_company_account_id_fkey"
            columns: ["company_account_id"]
            isOneToOne: false
            referencedRelation: "company_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "containers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "containers_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          company_account_id: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          is_ephemeral: boolean
          name: string
          notes: string | null
          tax_id: string | null
          updated_at: string
        }
        Insert: {
          company_account_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_ephemeral?: boolean
          name: string
          notes?: string | null
          tax_id?: string | null
          updated_at?: string
        }
        Update: {
          company_account_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_ephemeral?: boolean
          name?: string
          notes?: string | null
          tax_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_company_account_id_fkey"
            columns: ["company_account_id"]
            isOneToOne: false
            referencedRelation: "company_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          company_account_id: string
          created_at: string
          created_by: string | null
          customer_id: string | null
          id: string
          is_active: boolean
          is_ephemeral: boolean
          license_expires_at: string | null
          license_number: string | null
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          company_account_id: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          id?: string
          is_active?: boolean
          is_ephemeral?: boolean
          license_expires_at?: string | null
          license_number?: string | null
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          company_account_id?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          id?: string
          is_active?: boolean
          is_ephemeral?: boolean
          license_expires_at?: string | null
          license_number?: string | null
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "drivers_company_account_id_fkey"
            columns: ["company_account_id"]
            isOneToOne: false
            referencedRelation: "company_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drivers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drivers_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_counters: {
        Row: {
          company_account_id: string
          day: string
          last_number: number
        }
        Insert: {
          company_account_id: string
          day: string
          last_number?: number
        }
        Update: {
          company_account_id?: string
          day?: string
          last_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "inspection_counters_company_account_id_fkey"
            columns: ["company_account_id"]
            isOneToOne: false
            referencedRelation: "company_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_events: {
        Row: {
          actor_id: string | null
          event: string
          id: number
          inspection_id: string
          occurred_at: string
          payload: Json
        }
        Insert: {
          actor_id?: string | null
          event: string
          id?: number
          inspection_id: string
          occurred_at?: string
          payload?: Json
        }
        Update: {
          actor_id?: string | null
          event?: string
          id?: number
          inspection_id?: string
          occurred_at?: string
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "inspection_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_events_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_media: {
        Row: {
          ai_analysis: Json | null
          ai_analyzed_at: string | null
          captured_at: string
          client_id: string | null
          company_account_id: string
          container_position: number | null
          created_at: string
          duration_seconds: number | null
          height: number | null
          id: string
          inspection_id: string
          kind: Database["public"]["Enums"]["media_kind"]
          latitude: number | null
          longitude: number | null
          mime_type: string | null
          phase: string
          point_key: string | null
          point_label: string | null
          size_bytes: number | null
          sort_order: number
          storage_path: string | null
          updated_at: string
          upload_error: string | null
          upload_status: Database["public"]["Enums"]["media_upload_status"]
          uploaded_at: string | null
          width: number | null
        }
        Insert: {
          ai_analysis?: Json | null
          ai_analyzed_at?: string | null
          captured_at: string
          client_id?: string | null
          company_account_id: string
          container_position?: number | null
          created_at?: string
          duration_seconds?: number | null
          height?: number | null
          id?: string
          inspection_id: string
          kind?: Database["public"]["Enums"]["media_kind"]
          latitude?: number | null
          longitude?: number | null
          mime_type?: string | null
          phase: string
          point_key?: string | null
          point_label?: string | null
          size_bytes?: number | null
          sort_order?: number
          storage_path?: string | null
          updated_at?: string
          upload_error?: string | null
          upload_status?: Database["public"]["Enums"]["media_upload_status"]
          uploaded_at?: string | null
          width?: number | null
        }
        Update: {
          ai_analysis?: Json | null
          ai_analyzed_at?: string | null
          captured_at?: string
          client_id?: string | null
          company_account_id?: string
          container_position?: number | null
          created_at?: string
          duration_seconds?: number | null
          height?: number | null
          id?: string
          inspection_id?: string
          kind?: Database["public"]["Enums"]["media_kind"]
          latitude?: number | null
          longitude?: number | null
          mime_type?: string | null
          phase?: string
          point_key?: string | null
          point_label?: string | null
          size_bytes?: number | null
          sort_order?: number
          storage_path?: string | null
          updated_at?: string
          upload_error?: string | null
          upload_status?: Database["public"]["Enums"]["media_upload_status"]
          uploaded_at?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inspection_media_company_account_id_fkey"
            columns: ["company_account_id"]
            isOneToOne: false
            referencedRelation: "company_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_media_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      inspections: {
        Row: {
          ai: Json
          assigned_at: string | null
          assigned_by: string | null
          assigned_to: string | null
          company_account_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          customer_name: string | null
          data: Json
          deleted_at: string | null
          display_id: string
          driver_id: string | null
          driver_name: string | null
          duration_seconds: number | null
          entered_at: string | null
          entry_status: Database["public"]["Enums"]["load_status"] | null
          evidence_url: string | null
          exit_status: Database["public"]["Enums"]["load_status"] | null
          findings_count: number
          id: string
          is_full: boolean
          latitude: number | null
          location_accuracy: number | null
          location_captured: boolean
          longitude: number | null
          movement: Database["public"]["Enums"]["movement_type"] | null
          movement_other: string | null
          not_applicable: Json
          passed: boolean | null
          paused_at: string | null
          progress: Json
          report_url: string | null
          scheduled_for: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["inspection_status"]
          timings: Json
          tractor_id: string | null
          tractor_number: string | null
          transport_type: Database["public"]["Enums"]["transport_type"] | null
          updated_at: string
          verification_revoked_at: string | null
          verification_token: string | null
        }
        Insert: {
          ai?: Json
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_to?: string | null
          company_account_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_name?: string | null
          data?: Json
          deleted_at?: string | null
          display_id?: string
          driver_id?: string | null
          driver_name?: string | null
          duration_seconds?: number | null
          entered_at?: string | null
          entry_status?: Database["public"]["Enums"]["load_status"] | null
          evidence_url?: string | null
          exit_status?: Database["public"]["Enums"]["load_status"] | null
          findings_count?: number
          id?: string
          is_full?: boolean
          latitude?: number | null
          location_accuracy?: number | null
          location_captured?: boolean
          longitude?: number | null
          movement?: Database["public"]["Enums"]["movement_type"] | null
          movement_other?: string | null
          not_applicable?: Json
          passed?: boolean | null
          paused_at?: string | null
          progress?: Json
          report_url?: string | null
          scheduled_for?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["inspection_status"]
          timings?: Json
          tractor_id?: string | null
          tractor_number?: string | null
          transport_type?: Database["public"]["Enums"]["transport_type"] | null
          updated_at?: string
          verification_revoked_at?: string | null
          verification_token?: string | null
        }
        Update: {
          ai?: Json
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_to?: string | null
          company_account_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_name?: string | null
          data?: Json
          deleted_at?: string | null
          display_id?: string
          driver_id?: string | null
          driver_name?: string | null
          duration_seconds?: number | null
          entered_at?: string | null
          entry_status?: Database["public"]["Enums"]["load_status"] | null
          evidence_url?: string | null
          exit_status?: Database["public"]["Enums"]["load_status"] | null
          findings_count?: number
          id?: string
          is_full?: boolean
          latitude?: number | null
          location_accuracy?: number | null
          location_captured?: boolean
          longitude?: number | null
          movement?: Database["public"]["Enums"]["movement_type"] | null
          movement_other?: string | null
          not_applicable?: Json
          passed?: boolean | null
          paused_at?: string | null
          progress?: Json
          report_url?: string | null
          scheduled_for?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["inspection_status"]
          timings?: Json
          tractor_id?: string | null
          tractor_number?: string | null
          transport_type?: Database["public"]["Enums"]["transport_type"] | null
          updated_at?: string
          verification_revoked_at?: string | null
          verification_token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspections_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_company_account_id_fkey"
            columns: ["company_account_id"]
            isOneToOne: false
            referencedRelation: "company_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_tractor_id_fkey"
            columns: ["tractor_id"]
            isOneToOne: false
            referencedRelation: "tractors"
            referencedColumns: ["id"]
          },
        ]
      }
      inspector_permissions: {
        Row: {
          can_create_container: boolean
          can_create_customer: boolean
          can_create_driver: boolean
          can_create_tractor: boolean
          can_edit_documents: boolean
          can_edit_movement_data: boolean
          can_start_new_inspection: boolean
          container_storage_mode: Database["public"]["Enums"]["catalog_storage_mode"]
          created_at: string
          customer_storage_mode: Database["public"]["Enums"]["catalog_storage_mode"]
          driver_storage_mode: Database["public"]["Enums"]["catalog_storage_mode"]
          profile_id: string
          tractor_storage_mode: Database["public"]["Enums"]["catalog_storage_mode"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          can_create_container?: boolean
          can_create_customer?: boolean
          can_create_driver?: boolean
          can_create_tractor?: boolean
          can_edit_documents?: boolean
          can_edit_movement_data?: boolean
          can_start_new_inspection?: boolean
          container_storage_mode?: Database["public"]["Enums"]["catalog_storage_mode"]
          created_at?: string
          customer_storage_mode?: Database["public"]["Enums"]["catalog_storage_mode"]
          driver_storage_mode?: Database["public"]["Enums"]["catalog_storage_mode"]
          profile_id: string
          tractor_storage_mode?: Database["public"]["Enums"]["catalog_storage_mode"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          can_create_container?: boolean
          can_create_customer?: boolean
          can_create_driver?: boolean
          can_create_tractor?: boolean
          can_edit_documents?: boolean
          can_edit_movement_data?: boolean
          can_start_new_inspection?: boolean
          container_storage_mode?: Database["public"]["Enums"]["catalog_storage_mode"]
          created_at?: string
          customer_storage_mode?: Database["public"]["Enums"]["catalog_storage_mode"]
          driver_storage_mode?: Database["public"]["Enums"]["catalog_storage_mode"]
          profile_id?: string
          tractor_storage_mode?: Database["public"]["Enums"]["catalog_storage_mode"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspector_permissions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspector_permissions_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_account_id: string
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          report_emails: string[]
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          company_account_id: string
          created_at?: string
          email: string
          full_name?: string
          id: string
          is_active?: boolean
          phone?: string | null
          report_emails?: string[]
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          company_account_id?: string
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          report_emails?: string[]
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_account_id_fkey"
            columns: ["company_account_id"]
            isOneToOne: false
            referencedRelation: "company_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      tractors: {
        Row: {
          brand: string | null
          company_account_id: string
          created_at: string
          created_by: string | null
          customer_id: string | null
          id: string
          is_active: boolean
          is_ephemeral: boolean
          model_year: number | null
          plates: string | null
          plates_state: string | null
          unit_number: string
          updated_at: string
        }
        Insert: {
          brand?: string | null
          company_account_id: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          id?: string
          is_active?: boolean
          is_ephemeral?: boolean
          model_year?: number | null
          plates?: string | null
          plates_state?: string | null
          unit_number: string
          updated_at?: string
        }
        Update: {
          brand?: string | null
          company_account_id?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          id?: string
          is_active?: boolean
          is_ephemeral?: boolean
          model_year?: number | null
          plates?: string | null
          plates_state?: string | null
          unit_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tractors_company_account_id_fkey"
            columns: ["company_account_id"]
            isOneToOne: false
            referencedRelation: "company_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tractors_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tractors_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_create_catalog: { Args: { kind: string }; Returns: boolean }
      current_company_account_id: { Args: never; Returns: string }
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      is_account_admin: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      admin_crear_usuario: {
        Args: {
          p_email: string
          p_password: string
          p_full_name: string
          p_role: Database["public"]["Enums"]["user_role"]
        }
        Returns: string
      }
      verificar_inspeccion: {
        Args: { token: string }
        Returns: {
          folio: string
          empresa: string
          fecha_inspeccion: string
          tipo_transporte: string
          tractor: string | null
          resultado: string
          hallazgos: number
        }[]
      }
    }
    Enums: {
      catalog_storage_mode: "persist" | "ephemeral"
      inspection_status:
        | "draft"
        | "assigned"
        | "in_progress"
        | "paused"
        | "completed"
        | "cancelled"
      load_status: "cargado" | "vacio" | "botando"
      media_kind: "photo" | "video" | "signature" | "document"
      media_upload_status: "pending" | "uploading" | "uploaded" | "failed"
      movement_type: "importacion" | "exportacion" | "local" | "otro"
      transport_type:
        | "caja"
        | "caja_refrigerada"
        | "contenedor"
        | "plataforma"
        | "van"
        | "rabon"
        | "torton"
        | "pipa"
        | "lowboy"
      user_role: "super_admin" | "admin" | "inspector"
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

export const Constants = {
  public: {
    Enums: {
      catalog_storage_mode: ["persist", "ephemeral"],
      inspection_status: [
        "draft",
        "assigned",
        "in_progress",
        "paused",
        "completed",
        "cancelled",
      ],
      load_status: ["cargado", "vacio", "botando"],
      media_kind: ["photo", "video", "signature", "document"],
      media_upload_status: ["pending", "uploading", "uploaded", "failed"],
      movement_type: ["importacion", "exportacion", "local", "otro"],
      transport_type: [
        "caja",
        "caja_refrigerada",
        "contenedor",
        "plataforma",
        "van",
        "rabon",
        "torton",
        "pipa",
        "lowboy",
      ],
      user_role: ["super_admin", "admin", "inspector"],
    },
  },
} as const
