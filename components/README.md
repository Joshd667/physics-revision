# Component-Based Architecture

This directory contains the modular HTML components that make up the Physics Revision app.

## 📁 Structure

```
components/
├── login-screen.html           # Authentication screen
├── sidebar.html               # Navigation sidebar with progress
├── header.html                # Main header with search and breadcrumbs
├── search-results.html        # Search results display
├── analytics-dashboard.html   # Analytics and charts
├── revision-view.html         # Revision content view
├── main-menu-cards.html      # Main category selection
├── section-cards.html        # Section grid view
└── topic-details.html        # Individual topic assessment
```

## 🔧 Development Workflow

### 1. Edit Components
Edit any component file in the `components/` directory. Each component contains:
- HTML structure with Alpine.js directives
- Tailwind CSS classes for styling
- All necessary x-show, x-data, and other Alpine.js functionality

### 2. Build the Application
After editing components, rebuild the main index.html:

```bash
./dev.sh build
```
or
```bash
python3 build.py
```

### 3. Test Changes
Start the development server:
```bash
./dev.sh dev
```

### 4. Auto-rebuild (Optional)
For automatic rebuilding when components change:
```bash
./dev.sh watch
```

## 📏 Component Guidelines

### Keep Alpine.js Functionality
- Maintain all `x-show`, `x-data`, `x-init` directives
- Preserve event handlers like `@click`, `@input`
- Keep template directives like `x-for`, `x-if`

### Styling Approach
- Use Tailwind CSS classes for styling
- Extract common styles to `css/components/` if needed
- Keep essential layout classes in HTML

### Component Independence
- Each component should be self-contained
- Share data through the main Alpine.js store
- Use consistent naming for shared functions

## 🎯 Benefits Achieved

1. **Maintainability**: Each component is ~50-200 lines vs 1,250+ line monolith
2. **Collaboration**: Multiple developers can work on different components
3. **Organization**: Clear separation of concerns
4. **Performance**: Smaller, more focused code sections
5. **Debugging**: Easier to locate and fix issues

## 📊 Size Reduction

- **Original**: 1,251 lines, 117 KB
- **New**: ~517 lines, 38 KB (when built)
- **Components**: 8 modular files, averaging ~100 lines each

## ⚡ Build Process

The build system uses `build.py` to:
1. Read `index-template.html`
2. Replace `{{ COMPONENT_NAME }}` placeholders
3. Insert component content from `components/`
4. Generate final `index.html`

## 🔄 Future Enhancements

- CSS extraction to component-specific files
- JavaScript module splitting
- Component-level testing
- Hot reload development server