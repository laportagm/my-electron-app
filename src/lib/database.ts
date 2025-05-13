/**
 * Brain anatomy database module using electron-store
 * This provides a SQLite-like interface but uses electron-store for storage
 * which doesn't require native module compilation
 */

import ElectronStore from 'electron-store';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import type { 
  BrainStructure, 
  CreateBrainStructureInput,
  UpdateBrainStructureInput,
  QueryHistory,
  CreateQueryHistoryInput,
  UserNote, 
  CreateUserNoteInput,
  UpdateUserNoteInput,
  StructureRelationship
} from '../types/database';

// Schema for electron-store
interface StoreSchema {
  database_version: string;
  brain_structures: Record<string, BrainStructure>;
  structure_relationships: Record<number, StructureRelationship>;
  structure_aliases: Record<string, string[]>;
  example_questions: Record<string, string[]>;
  query_history: Record<number, QueryHistory>;
  user_notes: Record<number, UserNote>;
  migrations: Array<{
    version: string;
    description: string;
    applied_at: number;
  }>;
  sequences: {
    relationship_id: number;
    query_history_id: number;
    user_note_id: number;
  };
}

// Database configuration
const DB_VERSION = '1.0.0';
const DB_FILENAME = 'brain_anatomy.json';

// Singleton store instance
let store: ElectronStore<StoreSchema> | null = null;

/**
 * Initialize the database, creating default data if it doesn't exist
 */
export function initializeDatabase(): ElectronStore<StoreSchema> {
  try {
    if (store) {
      return store;
    }

    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, DB_FILENAME);
    console.log(`Initializing brain anatomy database at ${dbPath}`);

    // Create store with defaults
    store = new ElectronStore<StoreSchema>({
      name: 'brain-anatomy-db',
      defaults: {
        database_version: DB_VERSION,
        brain_structures: {},
        structure_relationships: {},
        structure_aliases: {},
        example_questions: {},
        query_history: {},
        user_notes: {},
        migrations: [{
          version: '1.0.0',
          description: 'Initial schema creation',
          applied_at: Math.floor(Date.now() / 1000)
        }],
        sequences: {
          relationship_id: 1,
          query_history_id: 1,
          user_note_id: 1
        }
      }
    });

    // Run migrations if needed
    runMigrations();

    console.log('Database initialized successfully');
    return store;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

/**
 * Run database migrations if needed
 */
function runMigrations() {
  if (!store) {
    throw new Error('Database not initialized');
  }

  const currentVersion = store.get('database_version');
  
  // Add new migrations here as needed
  if (currentVersion !== DB_VERSION) {
    console.log(`Upgrading database from ${currentVersion} to ${DB_VERSION}`);
    
    // Update version
    store.set('database_version', DB_VERSION);
    
    // Add migration record
    const migrations = store.get('migrations');
    migrations.push({
      version: DB_VERSION,
      description: 'Updated database version',
      applied_at: Math.floor(Date.now() / 1000)
    });
    store.set('migrations', migrations);
  }
}

/**
 * Get the store instance
 */
export function getDatabase(): ElectronStore<StoreSchema> {
  if (!store) {
    return initializeDatabase();
  }
  return store;
}

/**
 * Close the database (no-op for ElectronStore, but kept for API compatibility)
 */
export function closeDatabase(): void {
  console.log('Database connection closed');
}

// ===== Brain Structures CRUD Operations =====

/**
 * Create a new brain structure
 */
export function createBrainStructure(data: CreateBrainStructureInput): BrainStructure {
  const store = getDatabase();
  const now = Math.floor(Date.now() / 1000);
  
  // Create the structure
  const structure: BrainStructure = {
    ...data,
    created_at: now,
    updated_at: now
  };
  
  // Get current structures and add the new one
  const structures = store.get('brain_structures');
  structures[data.id] = structure;
  store.set('brain_structures', structures);
  
  // Add aliases if provided
  if (data.aliases?.length) {
    const aliases = store.get('structure_aliases');
    aliases[data.id] = data.aliases;
    store.set('structure_aliases', aliases);
  }
  
  // Add example questions if provided
  if (data.example_questions?.length) {
    const questions = store.get('example_questions');
    questions[data.id] = data.example_questions;
    store.set('example_questions', questions);
  }
  
  return getBrainStructureById(data.id)!;
}

/**
 * Get a brain structure by ID
 */
export function getBrainStructureById(id: string): BrainStructure | null {
  const store = getDatabase();
  
  const structures = store.get('brain_structures');
  const structure = structures[id];
  
  if (!structure) {
    return null;
  }
  
  // Get aliases
  const allAliases = store.get('structure_aliases');
  const aliases = allAliases[id] || [];
  
  // Get example questions
  const allQuestions = store.get('example_questions');
  const example_questions = allQuestions[id] || [];
  
  return {
    ...structure,
    aliases,
    example_questions
  };
}

/**
 * Update a brain structure
 */
export function updateBrainStructure(id: string, data: UpdateBrainStructureInput): BrainStructure | null {
  const store = getDatabase();
  const structures = store.get('brain_structures');
  
  if (!structures[id]) {
    return null;
  }
  
  // Update the structure
  const updatedStructure = {
    ...structures[id],
    ...data,
    updated_at: Math.floor(Date.now() / 1000)
  };
  
  structures[id] = updatedStructure;
  store.set('brain_structures', structures);
  
  // Update aliases if provided
  if (data.aliases) {
    const aliases = store.get('structure_aliases');
    aliases[id] = data.aliases;
    store.set('structure_aliases', aliases);
  }
  
  // Update example questions if provided
  if (data.example_questions) {
    const questions = store.get('example_questions');
    questions[id] = data.example_questions;
    store.set('example_questions', questions);
  }
  
  return getBrainStructureById(id);
}

/**
 * Delete a brain structure
 */
export function deleteBrainStructure(id: string): boolean {
  const store = getDatabase();
  
  try {
    // Get current data
    const structures = store.get('brain_structures');
    const aliases = store.get('structure_aliases');
    const questions = store.get('example_questions');
    const relationships = store.get('structure_relationships');
    
    // Delete the structure
    if (structures[id]) {
      delete structures[id];
      store.set('brain_structures', structures);
    }
    
    // Delete aliases
    if (aliases[id]) {
      delete aliases[id];
      store.set('structure_aliases', aliases);
    }
    
    // Delete example questions
    if (questions[id]) {
      delete questions[id];
      store.set('example_questions', questions);
    }
    
    // Delete relationships
    const updatedRelationships: Record<number, StructureRelationship> = {};
    Object.entries(relationships).forEach(([key, rel]) => {
      if (rel.parent_id !== id && rel.child_id !== id) {
        updatedRelationships[Number(key)] = rel;
      }
    });
    store.set('structure_relationships', updatedRelationships);
    
    // Update parent_id for child structures
    Object.entries(structures).forEach(([structId, struct]) => {
      if (struct.parent_id === id) {
        struct.parent_id = null;
        structures[structId] = struct;
      }
    });
    store.set('brain_structures', structures);
    
    return true;
  } catch (error) {
    console.error(`Error deleting brain structure ${id}:`, error);
    return false;
  }
}

/**
 * List all brain structures
 */
export function listBrainStructures(options: { 
  region?: string,
  parentId?: string | null,
  visible?: boolean
} = {}): BrainStructure[] {
  const store = getDatabase();
  const structures = store.get('brain_structures');
  
  let result = Object.values(structures);
  
  // Apply filters
  if (options.region !== undefined) {
    result = result.filter(s => s.region === options.region);
  }
  
  if (options.parentId !== undefined) {
    if (options.parentId === null) {
      result = result.filter(s => s.parent_id === null);
    } else {
      result = result.filter(s => s.parent_id === options.parentId);
    }
  }
  
  if (options.visible !== undefined) {
    result = result.filter(s => Boolean(s.is_visible) === options.visible);
  }
  
  // Sort by name
  result.sort((a, b) => a.name.localeCompare(b.name));
  
  // Add empty aliases and questions arrays for consistency with getBrainStructureById
  return result.map(s => ({
    ...s,
    aliases: [],
    example_questions: []
  }));
}

/**
 * Search brain structures by name or description
 */
export function searchBrainStructures(query: string): BrainStructure[] {
  const store = getDatabase();
  const structures = store.get('brain_structures');
  const allAliases = store.get('structure_aliases');
  
  const searchQuery = query.toLowerCase();
  
  const result = Object.values(structures).filter(s => {
    // Check name and description
    if (s.name.toLowerCase().includes(searchQuery) || 
        s.description.toLowerCase().includes(searchQuery)) {
      return true;
    }
    
    // Check aliases
    const aliases = allAliases[s.id] || [];
    return aliases.some(alias => alias.toLowerCase().includes(searchQuery));
  });
  
  // Sort by name
  result.sort((a, b) => a.name.localeCompare(b.name));
  
  return result.map(s => ({
    ...s,
    aliases: [],
    example_questions: []
  }));
}

/**
 * Get child structures of a parent
 */
export function getChildStructures(parentId: string): BrainStructure[] {
  return listBrainStructures({ parentId });
}

/**
 * Get parent structure
 */
export function getParentStructure(childId: string): BrainStructure | null {
  const store = getDatabase();
  const structures = store.get('brain_structures');
  const child = structures[childId];
  
  if (!child || !child.parent_id) {
    return null;
  }
  
  return getBrainStructureById(child.parent_id);
}

// ===== Structure Relationships =====

/**
 * Create a relationship between structures
 */
export function createStructureRelationship(
  parentId: string, 
  childId: string, 
  relationshipType: 'contains' | 'connects_to' | 'part_of'
): StructureRelationship | null {
  const store = getDatabase();
  
  try {
    // Get current sequences and relationships
    const sequences = store.get('sequences');
    const relationships = store.get('structure_relationships');
    
    // Create new relationship
    const id = sequences.relationship_id++;
    const relationship: StructureRelationship = {
      id,
      parent_id: parentId,
      child_id: childId,
      relationship_type: relationshipType,
      created_at: Math.floor(Date.now() / 1000)
    };
    
    // Update store
    relationships[id] = relationship;
    store.set('structure_relationships', relationships);
    store.set('sequences', sequences);
    
    return relationship;
  } catch (error) {
    console.error('Error creating structure relationship:', error);
    return null;
  }
}

/**
 * Get relationships by structure ID
 */
export function getRelationships(structureId: string, type?: 'parent' | 'child'): StructureRelationship[] {
  const store = getDatabase();
  const relationships = store.get('structure_relationships');
  
  if (type === 'parent') {
    return Object.values(relationships).filter(rel => rel.child_id === structureId);
  } else if (type === 'child') {
    return Object.values(relationships).filter(rel => rel.parent_id === structureId);
  } else {
    return Object.values(relationships).filter(rel => 
      rel.parent_id === structureId || rel.child_id === structureId
    );
  }
}

/**
 * Delete a relationship
 */
export function deleteRelationship(id: number): boolean {
  const store = getDatabase();
  
  try {
    const relationships = store.get('structure_relationships');
    
    if (relationships[id]) {
      delete relationships[id];
      store.set('structure_relationships', relationships);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error deleting relationship:', error);
    return false;
  }
}

// ===== Query History =====

/**
 * Add a query to history
 */
export function addQueryHistory(data: CreateQueryHistoryInput): QueryHistory {
  const store = getDatabase();
  const sequences = store.get('sequences');
  const history = store.get('query_history');
  
  const id = sequences.query_history_id++;
  const timestamp = Math.floor(Date.now() / 1000);
  
  const query: QueryHistory = {
    id,
    question: data.question,
    answer: data.answer,
    structure_id: data.structure_id,
    timestamp
  };
  
  history[id] = query;
  store.set('query_history', history);
  store.set('sequences', sequences);
  
  return query;
}

/**
 * Get query history
 */
export function getQueryHistory(limit: number = 50, structureId?: string): QueryHistory[] {
  const store = getDatabase();
  const history = store.get('query_history');
  
  let result = Object.values(history);
  
  if (structureId) {
    result = result.filter(q => q.structure_id === structureId);
  }
  
  // Sort by timestamp descending and limit
  return result
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
}

/**
 * Delete query history
 */
export function deleteQueryHistory(id: number): boolean {
  const store = getDatabase();
  
  try {
    const history = store.get('query_history');
    
    if (history[id]) {
      delete history[id];
      store.set('query_history', history);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error deleting query history:', error);
    return false;
  }
}

/**
 * Clear all query history
 */
export function clearQueryHistory(): boolean {
  const store = getDatabase();
  
  try {
    store.set('query_history', {});
    return true;
  } catch (error) {
    console.error('Error clearing query history:', error);
    return false;
  }
}

// ===== User Notes =====

/**
 * Create a user note
 */
export function createUserNote(data: CreateUserNoteInput): UserNote | null {
  const store = getDatabase();
  
  try {
    const sequences = store.get('sequences');
    const notes = store.get('user_notes');
    
    const id = sequences.user_note_id++;
    const now = Math.floor(Date.now() / 1000);
    
    const note: UserNote = {
      id,
      structure_id: data.structure_id,
      title: data.title,
      content: data.content,
      created_at: now,
      updated_at: now
    };
    
    notes[id] = note;
    store.set('user_notes', notes);
    store.set('sequences', sequences);
    
    return note;
  } catch (error) {
    console.error('Error creating user note:', error);
    return null;
  }
}

/**
 * Get user notes for a structure
 */
export function getUserNotes(structureId: string): UserNote[] {
  const store = getDatabase();
  const notes = store.get('user_notes');
  
  return Object.values(notes)
    .filter(note => note.structure_id === structureId)
    .sort((a, b) => b.updated_at - a.updated_at);
}

/**
 * Update a user note
 */
export function updateUserNote(id: number, data: UpdateUserNoteInput): UserNote | null {
  const store = getDatabase();
  const notes = store.get('user_notes');
  
  if (!notes[id]) {
    return null;
  }
  
  const updatedNote = {
    ...notes[id],
    ...data,
    updated_at: Math.floor(Date.now() / 1000)
  };
  
  notes[id] = updatedNote;
  store.set('user_notes', notes);
  
  return updatedNote;
}

/**
 * Delete a user note
 */
export function deleteUserNote(id: number): boolean {
  const store = getDatabase();
  
  try {
    const notes = store.get('user_notes');
    
    if (notes[id]) {
      delete notes[id];
      store.set('user_notes', notes);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error deleting user note:', error);
    return false;
  }
}

// Export default instance getter
export default getDatabase;