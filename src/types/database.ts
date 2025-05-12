/**
 * TypeScript interfaces for brain anatomy database models
 */

/**
 * Represents a brain structure in the database
 */
export interface BrainStructure {
  id: string;
  parent_id: string | null;
  name: string;
  description: string;
  region: string;
  function: string;
  is_visible: boolean;
  model_path?: string;
  color?: string;
  aliases?: string[];
  example_questions?: string[];
  created_at?: number;
  updated_at?: number;
}

/**
 * Represents the hierarchical relationship between brain structures
 */
export interface StructureRelationship {
  id: number;
  parent_id: string;
  child_id: string;
  relationship_type: 'contains' | 'connects_to' | 'part_of';
  created_at?: number;
}

/**
 * Represents a historical query and its response
 */
export interface QueryHistory {
  id: number;
  question: string;
  answer: string;
  structure_id?: string;
  timestamp: number;
}

/**
 * Represents user notes about a brain structure
 */
export interface UserNote {
  id: number;
  structure_id: string;
  title: string;
  content: string;
  created_at: number;
  updated_at: number;
}

/**
 * Function metadata for a brain structure
 */
export interface StructureFunction {
  id: number;
  structure_id: string;
  description: string;
  category: string;
  created_at: number;
}

/**
 * Database migration record
 */
export interface Migration {
  id: number;
  version: string;
  description: string;
  applied_at: number;
}

/**
 * Input types for creating or updating records
 */

export type CreateBrainStructureInput = Omit<BrainStructure, 'created_at' | 'updated_at'>;
export type UpdateBrainStructureInput = Partial<Omit<BrainStructure, 'id' | 'created_at' | 'updated_at'>>;

export type CreateQueryHistoryInput = Omit<QueryHistory, 'id' | 'timestamp'>;
export type UpdateQueryHistoryInput = Partial<Omit<QueryHistory, 'id' | 'timestamp'>>;

export type CreateUserNoteInput = Omit<UserNote, 'id' | 'created_at' | 'updated_at'>;
export type UpdateUserNoteInput = Partial<Omit<UserNote, 'id' | 'created_at' | 'updated_at'>>;