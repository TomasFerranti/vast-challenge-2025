"""
VAST Challenge Visualization Module

This module provides data for the vast challenge visualization copied from the original repository.
It serves various data files in JSON format for the D3.js visualizations.
"""

import json
import os
from flask import current_app

TITLE = "VAST Challenge Interactive Visualization"
DESCRIPTION = "Interactive data visualization combining people, sentiments, meetings, topics, and geographic data from the VAST Challenge dataset."

def get_data(file=None, **kwargs):
    """
    Get data for the vast challenge visualization.
    
    Parameters:
    file (str): The name of the data file to load (without .json/.geojson extension)
    
    Returns:
    dict: JSON data from the requested file
    """
    
    if not file:
        return {"error": "No file parameter specified"}
    
    # Map file names to actual files in the data directory
    file_mappings = {
        # Sentiment data
        "sentiments_filah": "sentiments_filah.json",
        "sentiments_trout": "sentiments_trout.json", 
        "sentiments_journalist": "sentiments_journalist.json",
        "sent_filah": "sent_filah.json",
        "sent_trout": "sent_trout.json",
        "sent_journalist": "sent_journalist.json",
        
        # Topics/meetings data
        "topics_filah": "topics_filah.json",
        "topics_trout": "topics_trout.json",
        "topics_journalist": "topics_journalist.json",
        
        # Trips data
        "trips_filah": "trips_filah.json",
        "trips_trout": "trips_trout.json",
        "trips_journalist": "trips_journalist.json",
        
        # Visits data
        "visits_filah": "visits_filah.json",
        "visits_trout": "visits_trout.json",
        "visits_journalist": "visits_journalist.json",
        
        # Topic places and geographic data
        "topic_places_ds": "topic_places_ds.json",
        "oceanus_map": "oceanus_map.geojson",
    }
    
    # Check if the requested file exists in our mappings
    if file not in file_mappings:
        return {"error": f"Unknown file: {file}"}
    
    # Get the actual filename
    filename = file_mappings[file]
    
    # Construct the full path to the data file
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    file_path = os.path.join(base_dir, "data", filename)
    
    # Check if file exists
    if not os.path.exists(file_path):
        return {"error": f"File not found: {filename}"}
    
    try:
        # Load and return the JSON data
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return data
    except json.JSONDecodeError as e:
        return {"error": f"Invalid JSON in file {filename}: {str(e)}"}
    except Exception as e:
        return {"error": f"Error loading file {filename}: {str(e)}"} 