/**
 * Model registry for brain model visualization
 */

export interface BrainModel {
  id: string;
  name: string;
  description: string;
  lowPolyUrl: string;
  highPolyUrl: string;
}

// Helper function to get the correct asset path
function getModelPath(filename: string): string {
  // Include both development and production paths for Vite/Electron
  if (process.env.NODE_ENV === 'development') {
    // For development, use the full path since we're accessing via http://localhost
    return `/public/assets/models/${filename}`;
  } else {
    // For production builds
    return `/assets/models/${filename}`;
  }
}

export const brainModels: BrainModel[] = [
  {
    id: 'Brain1',
    name: 'Complete Brain',
    description: 'Full brain model with all structures',
    lowPolyUrl: getModelPath('Brain1.glb'),
    highPolyUrl: getModelPath('Brain1.glb')
  },
  {
    id: 'BrainstemNerves',
    name: 'Brainstem Nerves',
    description: 'Cranial nerves of the brainstem',
    lowPolyUrl: getModelPath('BrainstemNerves.glb'),
    highPolyUrl: getModelPath('BrainstemNerves.glb')
  },
  {
    id: 'BrainstenBasal',
    name: 'Brainstem Basal',
    description: 'Basal structures of the brainstem',
    lowPolyUrl: getModelPath('BrainstenBasal.glb'),
    highPolyUrl: getModelPath('BrainstenBasal.glb')
  },
  {
    id: 'caudal-medulla',
    name: 'Caudal Medulla',
    description: 'Caudal portion of the medulla oblongata',
    lowPolyUrl: getModelPath('caudal-medulla.glb'),
    highPolyUrl: getModelPath('caudal-medulla.glb')
  },
  {
    id: 'CrainialNerves',
    name: 'Cranial Nerves',
    description: 'The 12 cranial nerves emerging from the brain',
    lowPolyUrl: getModelPath('CrainialNerves.glb'),
    highPolyUrl: getModelPath('CrainialNerves.glb')
  },
  {
    id: 'midbrain',
    name: 'Midbrain',
    description: 'Midbrain structures and connections',
    lowPolyUrl: getModelPath('midbrain.glb'),
    highPolyUrl: getModelPath('midbrain.glb')
  },
  {
    id: 'pons',
    name: 'Pons',
    description: 'Pontine nuclei and connections',
    lowPolyUrl: getModelPath('pons.glb'),
    highPolyUrl: getModelPath('pons.glb')
  },
  {
    id: 'rostral-medulla',
    name: 'Rostral Medulla',
    description: 'Rostral portion of the medulla oblongata',
    lowPolyUrl: getModelPath('rostral-medulla.glb'),
    highPolyUrl: getModelPath('rostral-medulla.glb')
  },
  {
    id: 'SpinalNerves1',
    name: 'Spinal Nerves (Upper)',
    description: 'Upper spinal nerve roots',
    lowPolyUrl: getModelPath('SpinalNerves1.glb'),
    highPolyUrl: getModelPath('SpinalNerves1.glb')
  },
  {
    id: 'SpinalNerves2',
    name: 'Spinal Nerves (Mid-Upper)',
    description: 'Mid-upper spinal nerve roots',
    lowPolyUrl: getModelPath('SpinalNerves2.glb'),
    highPolyUrl: getModelPath('SpinalNerves2.glb')
  },
  {
    id: 'SpinalNerves3',
    name: 'Spinal Nerves (Middle)',
    description: 'Middle section spinal nerve roots',
    lowPolyUrl: getModelPath('SpinalNerves3.glb'),
    highPolyUrl: getModelPath('SpinalNerves3.glb')
  },
  {
    id: 'SpinalNerves4',
    name: 'Spinal Nerves (Mid-Lower)',
    description: 'Mid-lower spinal nerve roots',
    lowPolyUrl: getModelPath('SpinalNerves4.glb'),
    highPolyUrl: getModelPath('SpinalNerves4.glb')
  },
  {
    id: 'SpinalNerves5',
    name: 'Spinal Nerves (Lower)',
    description: 'Lower spinal nerve roots',
    lowPolyUrl: getModelPath('SpinalNerves5.glb'),
    highPolyUrl: getModelPath('SpinalNerves5.glb')
  },
  {
    id: 'SpinalNerves6',
    name: 'Spinal Nerves (Lowest)',
    description: 'Lowest spinal nerve roots',
    lowPolyUrl: getModelPath('SpinalNerves6.glb'),
    highPolyUrl: getModelPath('SpinalNerves6.glb')
  },
  {
    id: 'StriatumBasal-Left',
    name: 'Left Striatum & Basal Ganglia',
    description: 'Left hemispheric striatum and basal ganglia',
    lowPolyUrl: getModelPath('StriatumBasal-Left.glb'),
    highPolyUrl: getModelPath('StriatumBasal-Left.glb')
  },
  {
    id: 'StriatumBasal-Right',
    name: 'Right Striatum & Basal Ganglia',
    description: 'Right hemispheric striatum and basal ganglia',
    lowPolyUrl: getModelPath('StriatumBasal-Right.glb'),
    highPolyUrl: getModelPath('StriatumBasal-Right.glb')
  },
  {
    id: 'Thalamus-Basal',
    name: 'Thalamus & Basal Ganglia',
    description: 'Thalamic nuclei and basal ganglia structures',
    lowPolyUrl: getModelPath('Thalamus-Basal.glb'),
    highPolyUrl: getModelPath('Thalamus-Basal.glb')
  },
  {
    id: 'Tracts',
    name: 'Neural Tracts',
    description: 'Major white matter tracts of the brain',
    lowPolyUrl: getModelPath('Tracts.glb'),
    highPolyUrl: getModelPath('Tracts.glb')
  },
  {
    id: 'Visual-Pathway-skull',
    name: 'Visual Pathway (with Skull)',
    description: 'Visual pathway with skull landmarks',
    lowPolyUrl: getModelPath('Visual-Pathway-skull.glb'),
    highPolyUrl: getModelPath('Visual-Pathway-skull.glb')
  },
  {
    id: 'Visual-Pathway',
    name: 'Visual Pathway',
    description: 'Visual processing pathway from retina to cortex',
    lowPolyUrl: getModelPath('Visual-Pathway.glb'),
    highPolyUrl: getModelPath('Visual-Pathway.glb')
  },
];

// Debug function to log all model paths
export function logModelPaths(): void {
  console.log('Model Registry - All Model Paths:');
  brainModels.forEach(model => {
    console.log(`${model.id}: ${model.lowPolyUrl}`);
  });
}

/**
 * Get a model by its ID
 */
export function getModelById(id: string): BrainModel | undefined {
  return brainModels.find(model => model.id === id);
}
