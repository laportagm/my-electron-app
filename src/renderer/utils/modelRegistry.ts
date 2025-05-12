/**
 * Model registry for brain model visualization
 */
import { validateAssets } from './assetManager';

export interface BrainModel {
  id: string;
  name: string;
  description: string;
  category?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  tags?: string[];
}

export const brainModels: BrainModel[] = [
  {
    id: 'Brain1',
    name: 'Complete Brain',
    description: 'Full brain model with all structures',
    category: 'overview',
    difficulty: 'beginner'
  },
  {
    id: 'BrainstemNerves',
    name: 'Brainstem Nerves',
    description: 'Cranial nerves of the brainstem',
    category: 'brainstem',
    difficulty: 'intermediate'
  },
  {
    id: 'BrainstenBasal',
    name: 'Brainstem Basal',
    description: 'Basal structures of the brainstem',
    category: 'brainstem',
    difficulty: 'intermediate'
  },
  {
    id: 'caudal-medulla',
    name: 'Caudal Medulla',
    description: 'Caudal portion of the medulla oblongata',
    category: 'brainstem',
    difficulty: 'advanced'
  },
  {
    id: 'CrainialNerves',
    name: 'Cranial Nerves',
    description: 'The 12 cranial nerves emerging from the brain',
    category: 'nerves',
    difficulty: 'intermediate'
  },
  {
    id: 'midbrain',
    name: 'Midbrain',
    description: 'Midbrain structures and connections',
    category: 'brainstem',
    difficulty: 'intermediate'
  },
  {
    id: 'pons',
    name: 'Pons',
    description: 'Pontine nuclei and connections',
    category: 'brainstem',
    difficulty: 'intermediate'
  },
  {
    id: 'rostral-medulla',
    name: 'Rostral Medulla',
    description: 'Rostral portion of the medulla oblongata',
    category: 'brainstem',
    difficulty: 'advanced'
  },
  {
    id: 'SpinalNerves1',
    name: 'Spinal Nerves (Upper)',
    description: 'Upper spinal nerve roots',
    category: 'nerves',
    difficulty: 'intermediate'
  },
  {
    id: 'SpinalNerves2',
    name: 'Spinal Nerves (Mid-Upper)',
    description: 'Mid-upper spinal nerve roots',
    category: 'nerves',
    difficulty: 'intermediate'
  },
  {
    id: 'SpinalNerves3',
    name: 'Spinal Nerves (Middle)',
    description: 'Middle section spinal nerve roots',
    category: 'nerves',
    difficulty: 'intermediate'
  },
  {
    id: 'SpinalNerves4',
    name: 'Spinal Nerves (Mid-Lower)',
    description: 'Mid-lower spinal nerve roots',
    category: 'nerves',
    difficulty: 'intermediate'
  },
  {
    id: 'SpinalNerves5',
    name: 'Spinal Nerves (Lower)',
    description: 'Lower spinal nerve roots',
    category: 'nerves',
    difficulty: 'intermediate'
  },
  {
    id: 'SpinalNerves6',
    name: 'Spinal Nerves (Lowest)',
    description: 'Lowest spinal nerve roots',
    category: 'nerves',
    difficulty: 'intermediate'
  },
  {
    id: 'StriatumBasal-Left',
    name: 'Left Striatum & Basal Ganglia',
    description: 'Left hemispheric striatum and basal ganglia',
    category: 'basal-ganglia',
    difficulty: 'advanced'
  },
  {
    id: 'StriatumBasal-Right',
    name: 'Right Striatum & Basal Ganglia',
    description: 'Right hemispheric striatum and basal ganglia',
    category: 'basal-ganglia',
    difficulty: 'advanced'
  },
  {
    id: 'Thalamus-Basal',
    name: 'Thalamus & Basal Ganglia',
    description: 'Thalamic nuclei and basal ganglia structures',
    category: 'basal-ganglia',
    difficulty: 'advanced'
  },
  {
    id: 'Tracts',
    name: 'Neural Tracts',
    description: 'Major white matter tracts of the brain',
    category: 'pathways',
    difficulty: 'intermediate'
  },
  {
    id: 'Visual-Pathway-skull',
    name: 'Visual Pathway (with Skull)',
    description: 'Visual pathway with skull landmarks',
    category: 'pathways',
    difficulty: 'intermediate'
  },
  {
    id: 'Visual-Pathway',
    name: 'Visual Pathway',
    description: 'Visual processing pathway from retina to cortex',
    category: 'pathways',
    difficulty: 'intermediate'
  },
];

/**
 * Get categories for filtering
 */
export function getCategories(): string[] {
  const categories = new Set<string>();
  brainModels.forEach(model => {
    if (model.category) categories.add(model.category);
  });
  return Array.from(categories);
}

/**
 * Get difficulty levels
 */
export function getDifficultyLevels(): string[] {
  return ['beginner', 'intermediate', 'advanced'];
}

/**
 * Get models by category
 */
export function getModelsByCategory(category: string): BrainModel[] {
  return brainModels.filter(model => model.category === category);
}

/**
 * Get a model by its ID
 */
export function getModelById(id: string): BrainModel | undefined {
  return brainModels.find(model => model.id === id);
}

/**
 * Get all model IDs for asset validation
 */
export function getAllModelIds(): string[] {
  return brainModels.map(model => model.id);
}

/**
 * Validate that all models exist
 */
export async function validateModels(): Promise<{ valid: boolean, missing: string[] }> {
  const ids = getAllModelIds();
  return await validateAssets(ids);
}
