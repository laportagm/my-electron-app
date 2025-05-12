# Brain Anatomy Database

This document provides information about the database system used for storing brain anatomy structures, relationships, and user interactions.

## Overview

The database system provides:

1. A hierarchical structure of brain anatomy elements
2. Storage for user queries and answers
3. User notes about specific brain structures
4. Relationships between different brain structures

## Implementation

For development purposes, this application uses `electron-store` to persist data in a JSON file, which avoids the native module compilation issues that can occur with SQLite in different environments. This implementation provides an identical API to what would be used with a SQLite backend, making it easy to switch in the future if desired.

## Data Storage

The database stores information in several collections:

### brain_structures
Stores information about each brain structure:
- `id`: Unique identifier
- `parent_id`: Reference to parent structure (hierarchical relationship)
- `name`: Name of the structure
- `description`: Detailed description
- `region`: Region of the brain (e.g., 'cerebrum', 'brainstem')
- `function`: Functional description
- `is_visible`: Visibility toggle for UI display
- `model_path`: Path to the 3D model file
- `color`: Default color for rendering
- `created_at`/`updated_at`: Timestamps

### structure_relationships
Stores non-hierarchical relationships between structures:
- `id`: Unique identifier
- `parent_id`: First structure in relationship
- `child_id`: Second structure in relationship
- `relationship_type`: Type of relationship ('contains', 'connects_to', 'part_of')
- `created_at`: Timestamp

### structure_aliases
Stores alternative names for structures:
- Maps structure_id to an array of aliases

### example_questions
Stores example questions for each structure:
- Maps structure_id to an array of questions

### query_history
Stores user query history:
- `id`: Unique identifier
- `question`: User question
- `answer`: System answer
- `structure_id`: Related brain structure (optional)
- `timestamp`: Time of query

### user_notes
Stores user notes about brain structures:
- `id`: Unique identifier
- `structure_id`: Reference to brain structure
- `title`: Note title
- `content`: Note content
- `created_at`/`updated_at`: Timestamps

## Usage

### Initializing the Database

To initialize the database with sample brain structures:

```bash
npm run db:init
```

This will:
1. Create the store file in the app's user data directory
2. Initialize all necessary collections
3. Populate the database with sample brain structures and relationships

### Database API

The main database API is available in `src/lib/database.ts`. Key functions include:

#### Brain Structures
- `getBrainStructureById(id)`: Get a structure by ID
- `listBrainStructures(options)`: List structures with filters
- `createBrainStructure(data)`: Create a new structure
- `updateBrainStructure(id, data)`: Update an existing structure
- `deleteBrainStructure(id)`: Delete a structure
- `searchBrainStructures(query)`: Search structures by name/description

#### Relationships
- `createStructureRelationship(parentId, childId, type)`: Create a relationship
- `getRelationships(structureId, type)`: Get relationships
- `deleteRelationship(id)`: Delete a relationship

#### Query History
- `addQueryHistory(data)`: Add a query to history
- `getQueryHistory(limit, structureId)`: Get query history
- `deleteQueryHistory(id)`: Delete a query
- `clearQueryHistory()`: Clear all history

#### User Notes
- `createUserNote(data)`: Create a user note
- `getUserNotes(structureId)`: Get notes for a structure
- `updateUserNote(id, data)`: Update a note
- `deleteUserNote(id)`: Delete a note

## Database Location

The database is stored in the application's user data directory:
- Windows: `%APPDATA%\my-electron-app\brain-anatomy-db.json`
- macOS: `~/Library/Application Support/my-electron-app/brain-anatomy-db.json`
- Linux: `~/.config/my-electron-app/brain-anatomy-db.json`

## Integration with Main Process

The database functionality is integrated with the Electron main process, allowing the renderer process to interact with it through IPC (Inter-Process Communication).

## Type Definitions

TypeScript interfaces for the database models are available in `src/types/database.ts`, ensuring type safety throughout the application.

## Future Enhancements

In the future, this implementation could be replaced with a proper SQLite backend if needed, while maintaining the same API. This would require:

1. Installing and configuring the `better-sqlite3` module
2. Updating the database implementation to use SQL queries
3. Creating a migration script to transfer data from the JSON store to SQLite

However, for most use cases, the current implementation provides excellent performance and sufficient functionality without the complexities of native module compilation.