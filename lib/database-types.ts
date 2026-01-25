// Database types for Supabase
export interface Database {
    public: {
        Tables: {
            folders: {
                Row: {
                    id: string;
                    user_id: string;
                    local_id: number | null;
                    name: string;
                    color: string;
                    icon: string;
                    created_at: string;
                    updated_at: string;
                    is_deleted: boolean;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    local_id?: number | null;
                    name: string;
                    color?: string;
                    icon?: string;
                    created_at?: string;
                    updated_at?: string;
                    is_deleted?: boolean;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    local_id?: number | null;
                    name?: string;
                    color?: string;
                    icon?: string;
                    created_at?: string;
                    updated_at?: string;
                    is_deleted?: boolean;
                };
            };
            sessions: {
                Row: {
                    id: string;
                    user_id: string;
                    local_id: number | null;
                    topic: string;
                    tags: string | null;
                    folder_id: string | null;
                    start_time: string;
                    end_time: string | null;
                    duration_seconds: number;
                    created_at: string;
                    updated_at: string;
                    is_deleted: boolean;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    local_id?: number | null;
                    topic: string;
                    tags?: string | null;
                    folder_id?: string | null;
                    start_time: string;
                    end_time?: string | null;
                    duration_seconds?: number;
                    created_at?: string;
                    updated_at?: string;
                    is_deleted?: boolean;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    local_id?: number | null;
                    topic?: string;
                    tags?: string | null;
                    folder_id?: string | null;
                    start_time?: string;
                    end_time?: string | null;
                    duration_seconds?: number;
                    created_at?: string;
                    updated_at?: string;
                    is_deleted?: boolean;
                };
            };
            topic_configs: {
                Row: {
                    id: string;
                    user_id: string;
                    topic: string;
                    allow_background: boolean;
                    color: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    topic: string;
                    allow_background?: boolean;
                    color?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    topic?: string;
                    allow_background?: boolean;
                    color?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            sync_state: {
                Row: {
                    user_id: string;
                    last_sync_at: string;
                    sessions_sync_at: string | null;
                    folders_sync_at: string | null;
                };
                Insert: {
                    user_id: string;
                    last_sync_at?: string;
                    sessions_sync_at?: string | null;
                    folders_sync_at?: string | null;
                };
                Update: {
                    user_id?: string;
                    last_sync_at?: string;
                    sessions_sync_at?: string | null;
                    folders_sync_at?: string | null;
                };
            };
        };
    };
}

// Export table types for convenience
export type Folder = Database['public']['Tables']['folders']['Row'];
export type FolderInsert = Database['public']['Tables']['folders']['Insert'];
export type Session = Database['public']['Tables']['sessions']['Row'];
export type SessionInsert = Database['public']['Tables']['sessions']['Insert'];
export type TopicConfig = Database['public']['Tables']['topic_configs']['Row'];
export type TopicConfigInsert = Database['public']['Tables']['topic_configs']['Insert'];
export type SyncState = Database['public']['Tables']['sync_state']['Row'];
