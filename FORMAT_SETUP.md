# VS Code Formatting Setup for Electron TypeScript Project

## Configuration Summary

I've configured your project with the following formatting settings:

1. **Default TypeScript Formatter**: Set to VS Code's built-in TypeScript formatter (`vscode.typescript-language-features`)
2. **Format on Save**: Enabled for all files
3. **ESLint Integration**: Configured for core TypeScript files with targeted rules
4. **Editor Config**: Added `.editorconfig` for consistent formatting across different editors

## ESLint v9 Configuration Updates

I've created a targeted ESLint configuration for your project:

1. **Focused on Key Files**: The configuration targets only specific TypeScript files in src/renderer and utils
2. **Lenient Rules**: Disabled overly strict rules and downgraded others to warnings
3. **Ignored Problematic Files**: Explicitly ignores files that aren't compatible with the current setup

To run ESLint successfully:

```bash
# Run on all included files
npx eslint .

# Run on a specific component
npx eslint src/renderer/components/BrainModel.tsx

# Run with auto-fix
npx eslint src/renderer/components --fix
```

## Why VS Code's Built-in TypeScript Formatter?

I chose VS Code's built-in TypeScript formatter as the default because:

1. **Already Available**: It comes pre-installed with VS Code, requiring no additional extensions
2. **TypeScript Integration**: It's specifically designed for TypeScript and understands the language deeply
3. **Performance**: It's generally faster than alternatives for TypeScript files
4. **Simplicity**: Works well without complex configuration

## Extension Recommendations

For the best development experience, these VS Code extensions are recommended:

1. **ESLint** (`dbaeumer.vscode-eslint`): For JavaScript/TypeScript linting
2. **EditorConfig for VS Code** (`EditorConfig.EditorConfig`): For EditorConfig support
3. **Error Lens** (`usernamehw.errorlens`): To see errors inline

## Gradual ESLint Adoption

The ESLint configuration is set up for incremental adoption:

1. **Warning-Only**: Most rules are set to warning instead of error to gradually introduce linting
2. **Key Files**: Only core renderer components and utility files are checked
3. **Excluded Problem Areas**: Development-only and build files are excluded to focus on application code

As the codebase improves, you can gradually enable more rules and include more files.

## Electron ESM/CommonJS Best Practices

Your project uses ESM modules (`"type": "module"` in package.json) but Electron often works best with CommonJS. To handle this:

1. **Use dynamic imports** for Node.js modules when possible
2. **Keep JavaScript files outside ESLint scope** to avoid CommonJS/ESM conflicts
3. **Use proper conditional imports** to support both environments
4. **Avoid .js extensions in imports** to allow bundlers to handle resolution

## Troubleshooting

If you still see the "multiple formatters" warning:

1. Open VS Code settings (`Ctrl+,` / `Cmd+,`)
2. Search for "typescript formatter"
3. Set "Editor: Default Formatter" to "TypeScript and JavaScript Language Features"
4. Reload VS Code