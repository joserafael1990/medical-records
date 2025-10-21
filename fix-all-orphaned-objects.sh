#!/bin/bash

echo "🔍 Searching for all orphaned object properties..."

# Find all files with potential orphaned object properties
find frontend/src -name "*.ts" -o -name "*.tsx" | while read file; do
    echo "Checking $file..."
    
    # Look for orphaned object properties (lines that start with whitespace + property: value)
    # but exclude legitimate object definitions
    grep -n "^\s*[a-zA-Z_][a-zA-Z0-9_]*\s*:" "$file" | while read line; do
        line_num=$(echo "$line" | cut -d: -f1)
        content=$(echo "$line" | cut -d: -f2-)
        
        # Check if this looks like an orphaned object property
        if [[ "$content" =~ ^\s*[a-zA-Z_][a-zA-Z0-9_]*\s*: ]]; then
            echo "  ⚠️  Potential orphaned object at line $line_num: $content"
        fi
    done
done

echo "✅ Search complete!"


