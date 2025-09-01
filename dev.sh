#!/bin/bash
# Development workflow script for the Physics Revision app

echo "🔧 Physics Revision App - Development Tools"
echo "============================================="

case "$1" in
    "build")
        echo "📦 Building index.html from components..."
        python3 build.py
        echo "✅ Build complete!"
        ;;
    "dev")
        echo "🚀 Starting development server..."
        echo "📝 Components are in: ./components/"
        echo "🔄 Run 'npm run build' after editing components"
        python3 -m http.server 8000
        ;;
    "watch")
        echo "👀 Watching components for changes..."
        echo "📁 Monitoring: ./components/, ./index-template.html"
        if command -v fswatch >/dev/null 2>&1; then
            fswatch -o ./components/ ./index-template.html | while read num; do
                echo "🔄 Changes detected, rebuilding..."
                python3 build.py
            done
        else
            echo "⚠️  fswatch not available. Please install it for auto-rebuild functionality."
            echo "    On macOS: brew install fswatch"
            echo "    On Ubuntu: sudo apt-get install fswatch"
        fi
        ;;
    "init")
        echo "🎯 Initializing development environment..."
        echo "Creating components directory structure..."
        mkdir -p components css/components js/components
        echo "✅ Development environment ready!"
        ;;
    *)
        echo "Usage: $0 {build|dev|watch|init}"
        echo ""
        echo "Commands:"
        echo "  build   - Build index.html from components"
        echo "  dev     - Start development server"
        echo "  watch   - Watch for changes and auto-rebuild"
        echo "  init    - Initialize development environment"
        echo ""
        echo "Workflow:"
        echo "1. Edit components in ./components/"
        echo "2. Run 'dev.sh build' to assemble index.html"
        echo "3. Test with 'dev.sh dev'"
        exit 1
        ;;
esac