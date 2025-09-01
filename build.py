#!/usr/bin/env python3
"""
Simple HTML component assembler for the Physics Revision app.
This script combines component HTML files into a single index.html file.
"""

import os
import re
from pathlib import Path

def read_file(file_path):
    """Read a file and return its contents."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        print(f"Warning: Component file {file_path} not found")
        return f"<!-- Component {file_path} not found -->"

def build_index():
    """Build the complete index.html from components."""
    # Read the template
    template = read_file('index-template.html')
    
    # Define component mappings
    components = {
        'LOGIN_SCREEN_COMPONENT': 'components/login-screen.html',
        'SIDEBAR_COMPONENT': 'components/sidebar.html',
        'HEADER_COMPONENT': 'components/header.html',
        'ANALYTICS_COMPONENT': 'components/analytics-dashboard.html',
        'REVISION_COMPONENT': 'components/revision-view.html',
        'SEARCH_RESULTS_COMPONENT': 'components/search-results.html',
        'MAIN_MENU_COMPONENT': 'components/main-menu-cards.html',
        'SECTION_CARDS_COMPONENT': 'components/section-cards.html',
        'TOPIC_DETAILS_COMPONENT': 'components/topic-details.html'
    }
    
    # Replace component placeholders with actual content
    result = template
    for placeholder, component_file in components.items():
        component_content = read_file(component_file)
        result = result.replace(f'{{{{ {placeholder} }}}}', component_content)
    
    # Write the assembled file
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(result)
    
    print("✅ index.html assembled successfully!")
    
    # Check file size reduction
    original_size = os.path.getsize('index-backup.html')
    new_size = len(result)
    print(f"📊 Size comparison:")
    print(f"   Original: {original_size:,} bytes ({original_size // 1024} KB)")
    print(f"   New: {new_size:,} bytes ({new_size // 1024} KB)")
    
    # Count lines
    original_lines = len(read_file('index-backup.html').split('\n'))
    new_lines = len(result.split('\n'))
    print(f"📝 Line count:")
    print(f"   Original: {original_lines:,} lines")
    print(f"   New: {new_lines:,} lines")

if __name__ == '__main__':
    build_index()