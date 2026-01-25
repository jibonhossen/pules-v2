/**
 * PowerSync Schema Definition
 * Defines the client-side SQLite schema that mirrors Supabase tables
 */
import { column, Schema, Table } from '@powersync/react-native';

// Folders table - organizes topics into groups
const folders = new Table({
    user_id: column.text,
    name: column.text,
    color: column.text,
    icon: column.text,
    created_at: column.text,
    updated_at: column.text,
    is_deleted: column.integer, // Soft delete flag
});

// Sessions table - focus timer sessions
const sessions = new Table(
    {
        user_id: column.text,
        topic: column.text,
        tags: column.text,
        folder_id: column.text,
        start_time: column.text,
        end_time: column.text,
        duration_seconds: column.integer,
        created_at: column.text,
        updated_at: column.text,
        is_deleted: column.integer, // Soft delete flag
    },
    {
        indexes: {
            folder: ['folder_id'],
            topic: ['topic'],
            start_time: ['start_time'],
        },
    }
);

// Topic configs table - stores topic colors and settings
const topic_configs = new Table({
    user_id: column.text,
    topic: column.text,
    allow_background: column.integer, // Boolean as 0/1
    color: column.text,
    created_at: column.text,
    updated_at: column.text,
});

export const AppSchema = new Schema({
    folders,
    sessions,
    topic_configs,
});

// Export types for TypeScript
export type Database = (typeof AppSchema)['types'];
export type FolderRecord = Database['folders'];
export type SessionRecord = Database['sessions'];
export type TopicConfigRecord = Database['topic_configs'];
