"""
Map Timeline Visualization Module

Interactive map and timeline visualization copied from the vast-challenge repository.
Shows people movements and trip data with map visualization and timeline interaction.
"""

import json
import os
from flask import current_app

TITLE = "Geographic Site Visits & Movement Analysis"
DESCRIPTION = "Comparative visualization showing each committee member's site visits across three datasets using UMAP projection for geographic coordinates. Circles are color-coded by year to identify potential data entry errors and temporal patterns. The projection addresses geographical proximity issues, revealing that members typically visit two locations on Tuesdays, suggesting regular committee meeting schedules at these specific sites."

def get_data(file=None, **kwargs):
    """
    Get data for the map timeline visualization.
    
    Parameters:
    file (str): The name of the data file to load
    
    Returns:
    dict: JSON data from the requested file
    """
    
    if not file:
        return {"error": "No file parameter specified"}
    
    # Map file names to actual files in the data directory
    file_mappings = {
        # MC2_release data files (main datasets)
        "journalist": "journalist.json",
        "TROUT": "TROUT.json", 
        "FILAH": "FILAH.json",
        
        # Geographic data
        "umap": "umap.json",
        "oceanus_map": "oceanus_map.geojson",
        "road_map": "road_map.json",
    }
    
    # Check if the requested file exists in our mappings
    if file not in file_mappings:
        return {"error": f"Unknown file: {file}"}
    
    try:
        # Determine the correct file path based on file type
        if file in ["journalist", "TROUT", "FILAH"]:
            if file == "journalist":
                data_file = current_app.config.get("JOURNALIST_FILE")
            elif file == "TROUT":
                data_file = current_app.config.get("TROUT_FILE")
            elif file == "FILAH":
                data_file = current_app.config.get("FILAH_FILE")
        elif file == "oceanus_map":
            data_file = current_app.config.get("OCEANUS_MAP_FILE")
        elif file == "road_map":
            data_file = current_app.config.get("ROAD_MAP_FILE")
        elif file == "umap":
            # umap.json should be in the same directory as other data files
            base_dir = os.path.dirname(current_app.config.get("JOURNALIST_FILE", ""))
            data_file = os.path.join(base_dir, "umap.json")
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