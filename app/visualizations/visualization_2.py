"""
Graph Visualization Module

Interactive network graph for exploring relationships between different entities 
in the VAST Challenge 2025 MC2 data including meetings, people, organizations, 
topics, discussions, plans, and places.
"""

import json
import os
from flask import current_app

TITLE = "Network Graph"
DESCRIPTION = "Interactive network visualization showing relationships between entities, with layered filtering and dataset switching capabilities"

def get_data(file=None, **kwargs):
    """
    Get data for the graph visualization.
    
    Parameters:
    file (str): The name of the data file to load (without .json extension)
    
    Returns:
    dict: JSON data from the requested file or visualization metadata
    """
    
    if not file:
        # Return metadata when no specific file is requested
        return {
            "title": TITLE,
            "description": DESCRIPTION,
            "data_sources": ["journalist.json", "TROUT.json", "FILAH.json"],
            "features": [
                "Multi-dataset support (Journalist, TROUT, FILAH)",
                "Interactive layered filtering",
                "Node and link highlighting", 
                "Drag-and-drop functionality",
                "Zoom and pan controls",
                "Dynamic coloring by attributes",
                "Force-directed layout with custom forces"
            ],
            "node_types": [
                "meeting", "entity.person", "entity.organization", 
                "topic", "discussion", "plan", "place", "none"
            ],
            "status": "active"
        }
    
    # Map file names to actual files in the data directory
    file_mappings = {
        "journalist": "journalist.json",
        "TROUT": "TROUT.json", 
        "FILAH": "FILAH.json",
    }
    
    # Check if the requested file exists in our mappings
    if file not in file_mappings:
        return {"error": f"Unknown file: {file}"}
    
    try:
        # Get the correct data file path from Flask config
        if file == "journalist":
            data_file = current_app.config.get("JOURNALIST_FILE")
        elif file == "TROUT":
            data_file = current_app.config.get("TROUT_FILE")
        elif file == "FILAH":
            data_file = current_app.config.get("FILAH_FILE")
        else:
            return {"error": f"File mapping not found for: {file}"}
        
        if not data_file or not os.path.exists(data_file):
            return {"error": f"Data file not found: {data_file}"}
        
        with open(data_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        return data
        
    except FileNotFoundError:
        return {"error": f"Data file not found: {file}"}
    except json.JSONDecodeError as e:
        return {"error": f"Invalid JSON in file {file}: {str(e)}"}
    except Exception as e:
        return {"error": f"Error loading data from {file}: {str(e)}"} 