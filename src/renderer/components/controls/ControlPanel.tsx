import { useEffect, useState } from 'react';
import { useControls, folder, Leva, LevaPanel, button, LevaInputs } from 'leva';
import { useThree } from '@react-three/fiber';
import { useAppStore, shallow } from '../../store/useAppStore';

interface ControlPanelProps {
  modelId?: string;
}

export function ControlPanel({ modelId }: ControlPanelProps) {
  const { theme } = useAppStore(
    (state) => ({ 
      theme: state.ui.theme,
    }),
    shallow
  );
  
  const { camera, scene } = useThree();
  const [initialized, setInitialized] = useState(false);
  
  // Initialize controls once the component mounts
  useEffect(() => {
    if (!initialized) {
      setInitialized(true);
    }
  }, [initialized]);

  // Camera controls
  const [cameraParams] = useControls(() => ({
    'Camera': folder({
      position: {
        value: {
          x: camera.position.x,
          y: camera.position.y,
          z: camera.position.z,
        },
        step: 0.1,
        onChange: (value) => {
          camera.position.set(value.x, value.y, value.z);
          camera.updateProjectionMatrix();
        },
      },
      fov: {
        value: camera.isPerspectiveCamera ? (camera as THREE.PerspectiveCamera).fov : 50,
        min: 10,
        max: 120,
        step: 1,
        onChange: (value) => {
          if (camera.isPerspectiveCamera) {
            (camera as THREE.PerspectiveCamera).fov = value;
            camera.updateProjectionMatrix();
          }
        },
        disabled: !camera.isPerspectiveCamera,
      },
      reset: button(() => {
        camera.position.set(0, 0, 5);
        if (camera.isPerspectiveCamera) {
          (camera as THREE.PerspectiveCamera).fov = 50;
        }
        camera.lookAt(0, 0, 0);
        camera.updateProjectionMatrix();
      }),
    }),
  }), [camera, initialized]);

  // Lighting controls
  const [lightingParams] = useControls(() => ({
    'Lighting': folder({
      ambientIntensity: {
        value: 0.5,
        min: 0,
        max: 1,
        step: 0.01,
        onChange: (value) => {
          // Find ambient light in scene
          scene.traverse((object) => {
            if (object.type === 'AmbientLight') {
              (object as THREE.AmbientLight).intensity = value;
            }
          });
        },
      },
      directionalIntensity: {
        value: 0.8,
        min: 0,
        max: 2,
        step: 0.01,
        onChange: (value) => {
          // Find directional lights in scene
          scene.traverse((object) => {
            if (object.type === 'DirectionalLight') {
              (object as THREE.DirectionalLight).intensity = value;
            }
          });
        },
      },
    }),
  }), [scene, initialized]);

  // Model controls (conditional on having a modelId)
  const [modelParams] = useControls(() => ({
    'Model': folder(
      modelId 
        ? {
            wireframe: {
              value: false,
              onChange: (value) => {
                // Find model meshes and update wireframe property
                scene.traverse((object) => {
                  if (object.type === 'Mesh') {
                    const mesh = object as THREE.Mesh;
                    if (mesh.material) {
                      if (Array.isArray(mesh.material)) {
                        mesh.material.forEach((mat) => {
                          mat.wireframe = value;
                        });
                      } else {
                        mesh.material.wireframe = value;
                      }
                    }
                  }
                });
              },
            },
            opacity: {
              value: 1,
              min: 0,
              max: 1,
              step: 0.01,
              onChange: (value) => {
                // Find model meshes and update opacity
                scene.traverse((object) => {
                  if (object.type === 'Mesh') {
                    const mesh = object as THREE.Mesh;
                    if (mesh.material) {
                      if (Array.isArray(mesh.material)) {
                        mesh.material.forEach((mat) => {
                          mat.transparent = value < 1;
                          mat.opacity = value;
                          mat.needsUpdate = true;
                        });
                      } else {
                        mesh.material.transparent = value < 1;
                        mesh.material.opacity = value;
                        mesh.material.needsUpdate = true;
                      }
                    }
                  }
                });
              },
            },
            visible: {
              value: true,
              onChange: (value) => {
                // Find model root and toggle visibility
                scene.traverse((object) => {
                  if (object.userData?.modelId === modelId) {
                    object.visible = value;
                  }
                });
              },
            },
          }
        : {}
    ),
  }), [scene, modelId, initialized]);

  // Rendering controls
  const [renderingParams] = useControls(() => ({
    'Rendering': folder({
      shadows: {
        value: false,
        onChange: (value) => {
          // Toggle shadow rendering
          scene.traverse((object) => {
            if (object.type === 'DirectionalLight' || object.type === 'SpotLight') {
              const light = object as THREE.DirectionalLight | THREE.SpotLight;
              light.castShadow = value;
            } else if (object.type === 'Mesh') {
              const mesh = object as THREE.Mesh;
              mesh.castShadow = value;
              mesh.receiveShadow = value;
            }
          });
        },
      },
      showAxes: {
        value: false,
        onChange: (value) => {
          // Find axesHelper in scene and toggle visibility
          scene.traverse((object) => {
            if (object.type === 'AxesHelper') {
              object.visible = value;
            }
          });
        },
      },
    }),
  }), [scene, initialized]);

  return (
    <div className="control-panel-container">
      <Leva
        theme={theme === 'dark' ? {
          colors: {
            elevation1: '#1e293b',
            elevation2: '#0f172a',
            elevation3: '#334155',
            accent1: '#3b82f6',
            accent2: '#60a5fa',
            accent3: '#93c5fd',
            highlight1: '#f8fafc',
            highlight2: '#f1f5f9',
            highlight3: '#e2e8f0',
            vivid1: '#38bdf8',
          }
        } : undefined}
        fill
        flat
        titleBar={false}
      />
    </div>
  );
}

export default ControlPanel;