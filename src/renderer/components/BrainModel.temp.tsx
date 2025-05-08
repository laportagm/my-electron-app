// This is a temporary file to see the brain model function
function BrainModel() {
  const { scene } = useThree()
  const selectedId = useAppStore((s) => s.selectedId)
  const modelRef = useRef<Model3D | null>(null)
  const [loadedModel, setLoadedModel] = useState<ModelId | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const { setCurrentModelRef, setLoading, setSelected } = useModelControls()
  
  // [... earlier code ...]

  // Inside the loadBrainModel function:
  // Load the model - FIXED to remove dracoDecoderPath which isn't in the interface
  const model = await loadModel({
    id: selectedId,
    lowUrl: lowPolyUrl,
    highUrl: highPolyUrl
    // dracoDecoderPath property removed - it's now handled internally in loadModel.ts
  })
  
  // [... rest of the function ...]
}
