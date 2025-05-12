/**
 * Database initialization script for the brain anatomy application
 * This script initializes the database with sample brain structures data
 * 
 * Usage:
 *   ts-node scripts/init-database.ts
 */

import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { 
  initializeDatabase,
  createBrainStructure,
  getBrainStructureById,
  createStructureRelationship,
  closeDatabase
} from '../src/lib/database';
import { CreateBrainStructureInput } from '../types/database';

// If running directly with ts-node, we need to mock the app object
if (!app) {
  (global as any).app = {
    getPath: () => {
      return path.join(process.cwd(), 'app-data');
    }
  };
  
  // Create the directory if it doesn't exist
  const userDataPath = (global as any).app.getPath('userData');
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }
}

// Sample brain structures data
const brainStructures: CreateBrainStructureInput[] = [
  // Major divisions
  {
    id: 'brain',
    parent_id: null,
    name: 'Brain',
    description: 'The central organ of the human nervous system, located in the skull and protected by the cranium.',
    region: 'central_nervous_system',
    function: 'Coordinates sensory inputs, motor outputs, and cognitive processes.',
    is_visible: true,
    model_path: '/assets/models/brain.glb',
    color: '#F5DEB3',
    aliases: ['Encephalon'],
    example_questions: [
      'What are the major divisions of the brain?',
      'How does the brain process information?',
      'What is the average size of the human brain?'
    ]
  },
  
  // Cerebrum
  {
    id: 'cerebrum',
    parent_id: 'brain',
    name: 'Cerebrum',
    description: 'The largest and most developed part of the human brain, consisting of two hemispheres divided by a deep groove.',
    region: 'forebrain',
    function: 'Higher cognitive functions including thought, memory, language, consciousness, and voluntary movements.',
    is_visible: true,
    model_path: '/assets/models/cerebrum.glb',
    color: '#FFA07A',
    aliases: ['Cerebral Cortex', 'Telencephalon'],
    example_questions: [
      'What are the lobes of the cerebrum?',
      'What functions are associated with the cerebrum?',
      'How is the cerebrum protected?'
    ]
  },
  
  // Cerebrum - Lobes
  {
    id: 'frontal_lobe',
    parent_id: 'cerebrum',
    name: 'Frontal Lobe',
    description: 'The front part of the cerebrum, extending from the anterior to the central sulcus.',
    region: 'cerebrum',
    function: 'Executive functions, motor control, language expression, working memory, and personality.',
    is_visible: true,
    model_path: '/assets/models/frontal_lobe.glb',
    color: '#FF6347',
    aliases: ['Lobus Frontalis'],
    example_questions: [
      'What happens if the frontal lobe is damaged?',
      'What is the role of the frontal lobe in personality?',
      'Where is the frontal lobe located?'
    ]
  },
  
  {
    id: 'parietal_lobe',
    parent_id: 'cerebrum',
    name: 'Parietal Lobe',
    description: 'The middle part of the cerebrum, located behind the frontal lobe and above the temporal lobe.',
    region: 'cerebrum',
    function: 'Sensory integration, spatial awareness, and proprioception.',
    is_visible: true,
    model_path: '/assets/models/parietal_lobe.glb',
    color: '#87CEEB',
    aliases: ['Lobus Parietalis'],
    example_questions: [
      'What are the functions of the parietal lobe?',
      'How does damage to the parietal lobe affect a person?',
      'What sensory information does the parietal lobe process?'
    ]
  },
  
  {
    id: 'temporal_lobe',
    parent_id: 'cerebrum',
    name: 'Temporal Lobe',
    description: 'The lower lateral part of the cerebrum, located beneath the lateral fissure.',
    region: 'cerebrum',
    function: 'Auditory processing, memory formation, language comprehension, and emotion association.',
    is_visible: true,
    model_path: '/assets/models/temporal_lobe.glb',
    color: '#32CD32',
    aliases: ['Lobus Temporalis'],
    example_questions: [
      'What is the function of the temporal lobe?',
      'How does the temporal lobe process sound?',
      'What role does the temporal lobe play in memory?'
    ]
  },
  
  {
    id: 'occipital_lobe',
    parent_id: 'cerebrum',
    name: 'Occipital Lobe',
    description: 'The posterior region of the cerebrum, containing the visual cortex.',
    region: 'cerebrum',
    function: 'Visual processing, including color recognition, motion perception, and shape identification.',
    is_visible: true,
    model_path: '/assets/models/occipital_lobe.glb',
    color: '#9370DB',
    aliases: ['Lobus Occipitalis'],
    example_questions: [
      'What happens if the occipital lobe is damaged?',
      'How does the occipital lobe process visual information?',
      'What is the primary visual cortex?'
    ]
  },
  
  // Cerebellum
  {
    id: 'cerebellum',
    parent_id: 'brain',
    name: 'Cerebellum',
    description: 'A large structure located at the back of the brain, underneath the occipital lobes.',
    region: 'hindbrain',
    function: 'Coordination of voluntary movements, balance, posture, and motor learning.',
    is_visible: true,
    model_path: '/assets/models/cerebellum.glb',
    color: '#FFD700',
    aliases: ['Little Brain', 'Parencephalon'],
    example_questions: [
      'What is the function of the cerebellum?',
      'How does damage to the cerebellum affect movement?',
      'What is the structure of the cerebellum?'
    ]
  },
  
  // Brainstem
  {
    id: 'brainstem',
    parent_id: 'brain',
    name: 'Brainstem',
    description: 'The posterior part of the brain, connecting the cerebrum with the spinal cord.',
    region: 'hindbrain',
    function: 'Regulates basic vital functions such as breathing, heart rate, and consciousness.',
    is_visible: true,
    model_path: '/assets/models/brainstem.glb',
    color: '#CD853F',
    aliases: ['Truncus Encephali'],
    example_questions: [
      'What are the parts of the brainstem?',
      'What vital functions does the brainstem control?',
      'What happens if the brainstem is damaged?'
    ]
  },
  
  // Brainstem components
  {
    id: 'midbrain',
    parent_id: 'brainstem',
    name: 'Midbrain',
    description: 'The uppermost part of the brainstem, connecting the pons and the cerebellum with the cerebral hemispheres.',
    region: 'brainstem',
    function: 'Visual and auditory reflexes, eye movements, and motor coordination.',
    is_visible: true,
    model_path: '/assets/models/midbrain.glb',
    color: '#B8860B',
    aliases: ['Mesencephalon'],
    example_questions: [
      'What structures are found in the midbrain?',
      'What functions does the midbrain control?',
      'How does the midbrain relate to Parkinson\'s disease?'
    ]
  },
  
  {
    id: 'pons',
    parent_id: 'brainstem',
    name: 'Pons',
    description: 'The middle part of the brainstem, located between the midbrain and the medulla oblongata.',
    region: 'brainstem',
    function: 'Relay for signals between the cerebrum and cerebellum, regulation of breathing, and sleep.',
    is_visible: true,
    model_path: '/assets/models/pons.glb',
    color: '#DAA520',
    aliases: ['Pons Varolii'],
    example_questions: [
      'What is the function of the pons?',
      'How does the pons regulate breathing?',
      'What cranial nerves originate in the pons?'
    ]
  },
  
  {
    id: 'medulla_oblongata',
    parent_id: 'brainstem',
    name: 'Medulla Oblongata',
    description: 'The lowest part of the brainstem, connecting the spinal cord to the brain.',
    region: 'brainstem',
    function: 'Controls autonomic functions such as heart rate, blood pressure, breathing, and swallowing.',
    is_visible: true,
    model_path: '/assets/models/medulla.glb',
    color: '#D2B48C',
    aliases: ['Medulla', 'Bulb', 'Myelencephalon'],
    example_questions: [
      'What are the functions of the medulla oblongata?',
      'Why is the medulla oblongata vital for survival?',
      'What happens if the medulla oblongata is damaged?'
    ]
  },
  
  // Other key structures
  {
    id: 'thalamus',
    parent_id: 'brain',
    name: 'Thalamus',
    description: 'A large, dual lobed mass of gray matter located in the center of the brain, near the brainstem.',
    region: 'diencephalon',
    function: 'Relay station for sensory and motor signals to the cerebral cortex, regulation of consciousness and sleep.',
    is_visible: true,
    model_path: '/assets/models/thalamus.glb',
    color: '#E6E6FA',
    aliases: ['Thalamic Nuclei'],
    example_questions: [
      'What is the function of the thalamus?',
      'How does the thalamus relay sensory information?',
      'What happens if the thalamus is damaged?'
    ]
  },
  
  {
    id: 'hypothalamus',
    parent_id: 'brain',
    name: 'Hypothalamus',
    description: 'A small region located below the thalamus, forming the floor of the third ventricle.',
    region: 'diencephalon',
    function: 'Regulates body temperature, hunger, thirst, fatigue, sleep, and circadian rhythms.',
    is_visible: true,
    model_path: '/assets/models/hypothalamus.glb',
    color: '#FFC0CB',
    aliases: ['Hypothalamic Nuclei'],
    example_questions: [
      'What are the functions of the hypothalamus?',
      'How does the hypothalamus control hormones?',
      'What role does the hypothalamus play in regulating body temperature?'
    ]
  },
  
  {
    id: 'hippocampus',
    parent_id: 'temporal_lobe',
    name: 'Hippocampus',
    description: 'A curved formation in the medial temporal lobe that resembles a seahorse.',
    region: 'limbic_system',
    function: 'Critical for learning, memory formation, particularly long-term memory, and spatial navigation.',
    is_visible: true,
    model_path: '/assets/models/hippocampus.glb',
    color: '#E0FFFF',
    aliases: ['Hippocampal Formation'],
    example_questions: [
      'What is the role of the hippocampus in memory?',
      'How does Alzheimer\'s disease affect the hippocampus?',
      'What happens if the hippocampus is damaged?'
    ]
  },
  
  {
    id: 'amygdala',
    parent_id: 'temporal_lobe',
    name: 'Amygdala',
    description: 'Almond-shaped clusters of nuclei located deep within the medial temporal lobes.',
    region: 'limbic_system',
    function: 'Processing of memory, decision-making, and emotional reactions, particularly fear and anxiety.',
    is_visible: true,
    model_path: '/assets/models/amygdala.glb',
    color: '#FF69B4',
    aliases: ['Amygdaloid Complex'],
    example_questions: [
      'What role does the amygdala play in fear?',
      'How does the amygdala process emotions?',
      'What happens if the amygdala is damaged?'
    ]
  },
  
  {
    id: 'basal_ganglia',
    parent_id: 'brain',
    name: 'Basal Ganglia',
    description: 'A group of subcortical nuclei that are interconnected with the cerebral cortex, thalamus, and brainstem.',
    region: 'forebrain',
    function: 'Voluntary motor control, procedural learning, routine behaviors, eye movements, cognition, and emotion.',
    is_visible: true,
    model_path: '/assets/models/basal_ganglia.glb',
    color: '#A0522D',
    aliases: ['Basal Nuclei'],
    example_questions: [
      'What are the components of the basal ganglia?',
      'How do the basal ganglia contribute to movement?',
      'What is the relationship between the basal ganglia and Parkinson\'s disease?'
    ]
  }
];

// Additional relationships beyond parent-child
const additionalRelationships = [
  { parent: 'thalamus', child: 'cerebrum', type: 'connects_to' as const },
  { parent: 'cerebellum', child: 'brainstem', type: 'connects_to' as const },
  { parent: 'hypothalamus', child: 'thalamus', type: 'connects_to' as const },
  { parent: 'frontal_lobe', child: 'parietal_lobe', type: 'connects_to' as const },
  { parent: 'parietal_lobe', child: 'occipital_lobe', type: 'connects_to' as const },
  { parent: 'temporal_lobe', child: 'parietal_lobe', type: 'connects_to' as const },
  { parent: 'hippocampus', child: 'amygdala', type: 'connects_to' as const },
  { parent: 'midbrain', child: 'thalamus', type: 'connects_to' as const },
  { parent: 'basal_ganglia', child: 'thalamus', type: 'connects_to' as const },
  { parent: 'hippocampus', child: 'hypothalamus', type: 'connects_to' as const }
];

/**
 * Initialize the database with sample data
 */
async function initializeData() {
  try {
    console.log('Initializing database...');
    
    // Initialize database
    const store = initializeDatabase();
    
    console.log('Creating brain structures...');
    
    // Create brain structures
    for (const structure of brainStructures) {
      const existingStructure = getBrainStructureById(structure.id);
      
      if (!existingStructure) {
        console.log(`Creating structure: ${structure.name}`);
        createBrainStructure(structure);
      } else {
        console.log(`Structure already exists: ${structure.name}`);
      }
    }
    
    console.log('Creating additional relationships...');
    
    // Create additional relationships
    for (const rel of additionalRelationships) {
      // Check if both structures exist before creating relationship
      const parent = getBrainStructureById(rel.parent);
      const child = getBrainStructureById(rel.child);
      
      if (parent && child) {
        console.log(`Creating relationship: ${parent.name} ${rel.type} ${child.name}`);
        createStructureRelationship(rel.parent, rel.child, rel.type);
      } else {
        console.log(`Cannot create relationship: one or both structures do not exist (${rel.parent}, ${rel.child})`);
      }
    }
    
    console.log('Initialization completed successfully!');
    closeDatabase();
    
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

// Only run if executed directly
if (require.main === module) {
  initializeData().catch(err => {
    console.error('Initialization failed:', err);
    process.exit(1);
  });
}

export { initializeData };