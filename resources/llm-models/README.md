# LLM Models Directory

This directory is used to store GGUF format models for node-llama-cpp.

## Recommended Models

For a brain anatomy application, we recommend using specialized medical models or general purpose models with good factual recall:

1. **Llama 3 8B Instruct** - Good balance of size and performance
   - Filename: `llama-3-8b-instruct.Q4_K_M.gguf`
   - Size: ~4GB
   - [Download Link](https://huggingface.co/TheBloke/Llama-3-8B-Instruct-GGUF)

2. **Mistral 7B Instruct** - Good for medical knowledge
   - Filename: `mistral-7b-instruct-v0.2.Q4_K_M.gguf`
   - Size: ~4GB
   - [Download Link](https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.2-GGUF)

3. **Phi-3-mini-4k-instruct** - Smaller but still capable
   - Filename: `phi-3-mini-4k-instruct.Q4_K_M.gguf`
   - Size: ~2GB
   - [Download Link](https://huggingface.co/microsoft/Phi-3-mini-4k-instruct-GGUF)

## How to Use

1. Download the desired GGUF model file
2. Place the file in this directory
3. The model will be included in the application build
4. Select the model in the application settings

## Notes

- Quantized models (Q4_K_M) provide a good balance of size and quality
- Models are bundled with the application package
- For development, you can manually download models to this directory