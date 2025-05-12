import React, { useEffect, useRef, useState, useCallback, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useAppStore, shallow } from '@/store/useAppStore';
import { loadModel } from '@/utils/loadModel';
import { getModelById } from '@/utils/modelRegistry';
import * as THREE from 'three';

interface MultipleModelsProps {}

/**
 * Component for displaying multiple models simultaneously
 * This is used when selecting model groups from the side panel
 */
function MultipleModels({}: MultipleModelsProps) {
  // Use individual selectors to prevent unnecessary re-renders
  const selectedIds = useAppStore(state => state.selectedIds, shallow);
  const showMultiple = useAppStore(state => state.showMultiple);
  const setCurrentModelRefAction = useAppStore(state => state.setCurrentModelRef);
  const setLoadingAction = useAppStore(state => state.setLoading);

  // Memoize action functions to prevent unnecessary re-renders
  const setCurrentModelRef = useCallback((ref: THREE.Group | null) => {
    setCurrentModelRefAction(ref);
  }, [setCurrentModelRefAction]);

  const setLoading = useCallback((isLoading: boolean) => {
    setLoadingAction(isLoading);
  }, [setLoadingAction]);

  const containerRef = useRef<THREE.Group>(null);
  const [loadedModels, setLoadedModels] = useState<Record<string, THREE.Group>>({});
  const [failedIds, setFailedIds] = useState<string[]>([]);

  // Create a fallback indicator for failed models - memoized to prevent recreations
  const createFallbackIndicator = useCallback((id: string, totalModels: number) => {
    const fallback = new THREE.Group();
    fallback.name = `Fallback-${id}`;

    // Create a red cube
    const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const cube = new THREE.Mesh(geometry, material);

    // Position it appropriately
    positionModel(fallback, id, selectedIds, totalModels);

    fallback.add(cube);
    return fallback;
  }, [selectedIds]);

  // Position models relative to each other in correct anatomical orientation
  // Memoize this function to avoid unnecessary recreations
  const positionModel = useCallback((
    model: THREE.Group,
    id: string,
    ids: string[],
    totalModels: number
  ) => {
    // Handle spinal nerves specifically to ensure proper anatomical positioning
    if (id.startsWith('SpinalNerves')) {
      // Keep all spinal models in their original positions - no adjustments
      // They are already designed to overlap correctly when in the same scene
      return;
    }

    // For all other model groups, position by model index
    const index = ids.indexOf(id);
    if (index === -1) return;

    // If there's only one model, center it
    if (totalModels === 1) {
      model.position.set(0, 0, 0);
      return;
    }

    // For model groups other than spinal nerves, use a more conventional
    // arrangement that doesn't interfere with anatomical overlapping
    if (!id.startsWith('SpinalNerves')) {
      // For other groups, arrange in a horizontal line
      const spacing = 2;
      const startX = -(totalModels - 1) * spacing / 2;
      model.position.set(startX + index * spacing, 0, 0);
    }
  }, []);

  // Memoized function to load a single model
  const loadSingleModel = useCallback(async (
    id: string,
    newLoadedModels: Record<string, THREE.Group>,
    newFailedIds: string[]
  ) => {
    try {
      // Get model metadata
      const modelInfo = getModelById(id);
      if (!modelInfo) {
        console.warn(`Model with ID "${id}" not found in registry`);
        newFailedIds.push(id);
        return { loadedModel: null, failed: true };
      }

      console.log(`Loading model: ${modelInfo.name} (${id})`);

      // Load the model
      const lowUrl = `assets/models/${id}.glb`;
      const highUrl = `assets/models/high-poly/${id}.glb`;

      const loadedModel = await loadModel({ id, lowUrl, highUrl });

      // Set appropriate initial position based on the model ID
      positionModel(loadedModel, id, selectedIds, selectedIds.length);

      newLoadedModels[id] = loadedModel;
      return { loadedModel, failed: false };
    } catch (err) {
      console.error(`Failed to load model ${id}:`, err);
      newFailedIds.push(id);
      return { loadedModel: null, failed: true };
    }
  }, [positionModel, selectedIds]);

  // Load models when the selection changes
  useEffect(() => {
    if (!showMultiple || selectedIds.length === 0) return;

    const loadSelectedModels = async () => {
      console.log(`Loading ${selectedIds.length} models: ${selectedIds.join(', ')}`);
      setLoading(true);

      const newLoadedModels: Record<string, THREE.Group> = {};
      const newFailedIds: string[] = [];

      try {
        // Create a promise for each model to load
        const loadPromises = selectedIds.map(id =>
          loadSingleModel(id, newLoadedModels, newFailedIds)
        );

        // Wait for all models to load
        await Promise.all(loadPromises);

        // Update loaded models state
        setLoadedModels(newLoadedModels);
        setFailedIds(newFailedIds);
      } catch (err) {
        console.error('Error loading models:', err);
      } finally {
        setLoading(false);
      }
    };

    loadSelectedModels();

    // Cleanup when unmounted or selection changes
    return () => {
      // Cleanup any resources that might need disposing
      // For Three.js objects, we might need to dispose geometries and materials
      Object.values(loadedModels).forEach(model => {
        // Proper Three.js cleanup would go here if needed
      });
    };
  }, [selectedIds, showMultiple, setLoading, loadSingleModel]);

  // Update container with new models - memoized with deps
  const updateContainer = useCallback(() => {
    if (!containerRef.current) return;

    // Register with global state
    setCurrentModelRef(containerRef.current);

    // Clear any existing children - with null check to satisfy TypeScript
    if (containerRef.current.children.length > 0) {
      while (containerRef.current.children.length > 0 && containerRef.current.children[0]) {
        containerRef.current.remove(containerRef.current.children[0]);
      }
    }

    // Add all loaded models
    Object.values(loadedModels).forEach(model => {
      containerRef.current?.add(model);
    });

    // Add fallback indicators for any models that failed to load
    failedIds.forEach(id => {
      const fallbackCube = createFallbackIndicator(id, selectedIds.length);
      containerRef.current?.add(fallbackCube);
    });
  }, [loadedModels, failedIds, setCurrentModelRef, createFallbackIndicator, selectedIds.length]);

  // Update container whenever models change
  useEffect(() => {
    updateContainer();
  }, [updateContainer]);

  // Simple animation to rotate the models - disable for spinal models
  useFrame((_, delta) => {
    if (containerRef.current && showMultiple) {
      // Check if we're showing spinal models
      const isSpinalGroup = selectedIds.some(id => id.startsWith('SpinalNerves'));

      // Don't rotate spinal models as they need to maintain alignment
      if (!isSpinalGroup) {
        containerRef.current.rotation.y += delta * 0.05; // Very slow rotation for non-spinal models
      }
    }
  });

  return (
    <group ref={containerRef} name="multi-model-container">
      {/* Models will be added here by useEffect */}
    </group>
  );
}

export default memo(MultipleModels);