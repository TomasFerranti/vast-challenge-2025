"""
Timeline Visualization for VAST Challenge 2025 Mini-Challenge 2
Shows trips by person over time with place connections and city color coding
"""

import json
import os
from flask import current_app
from collections import defaultdict
from datetime import datetime, timedelta
import numpy as np

TITLE = "Timeline: Person Trip Visualization"
DESCRIPTION = "Interactive timeline showing trips by person with place connections and city color coding"

def get_data(**params):
    """
    Get data for timeline visualization.
    Returns trip data for selected dataset and person.
    """
    try:
        # Get parameters
        dataset = params.get('dataset', 'journalist')
        person_id = params.get('person', None)
        fix_dates = params.get('fix_dates', 'true').lower() == 'true'
        
        # Load the appropriate dataset
        if dataset == 'FILAH':
            data_file = current_app.config.get("FILAH_FILE")
        elif dataset == 'TROUT':
            data_file = current_app.config.get("TROUT_FILE")
        elif dataset == 'journalist':
            data_file = current_app.config.get("JOURNALIST_FILE")
        else:
            return {"error": "Invalid dataset. Use 'FILAH', 'TROUT', or 'journalist'"}
        
        if not data_file or not os.path.exists(data_file):
            return {"error": f"{dataset} data file not found"}
        
        # Load road map for city information
        road_map_file = current_app.config.get("ROAD_MAP_FILE")
        if not road_map_file or not os.path.exists(road_map_file):
            return {"error": "Road map file not found"}
        
        with open(data_file, 'r') as f:
            data = json.load(f)
        
        with open(road_map_file, 'r') as f:
            road_map = json.load(f)
        
        # Extract persons from nodes
        persons = []
        person_nodes = {}
        for node in data.get("nodes", []):
            if node.get("type") == "entity.person":
                person_info = {
                    "id": node.get("id"),
                    "name": node.get("name", node.get("id")),
                    "role": node.get("role", "")
                }
                persons.append(person_info)
                person_nodes[node.get("id")] = person_info
        
        # If no person specified, return list of persons
        if not person_id:
            return {"persons": persons}
        
        # Validate person exists
        if person_id not in person_nodes:
            return {"error": f"Person {person_id} not found in dataset"}
        
        # Extract trips and places from nodes
        trips = {}
        places = {}
        
        for node in data.get("nodes", []):
            if node.get("type") == "trip":
                trip_date = node.get("date", "")
                # Fix date format if needed
                if fix_dates and trip_date.startswith("0040-"):
                    trip_date = trip_date.replace("0040-", "2040-")
                
                trips[node.get("id")] = {
                    "id": node.get("id"),
                    "date": trip_date,
                    "start": node.get("start", ""),
                    "end": node.get("end", ""),
                    "places": []
                }
            elif node.get("type") in ["place", "None"]:
                places[node.get("id")] = {
                    "id": node.get("id"),
                    "name": node.get("name", ""),
                    "lat": node.get("lat", 0),
                    "lon": node.get("lon", 0),
                    "longitude": node.get("longitude", node.get("lon", 0)),
                    "latitude": node.get("latitude", node.get("lat", 0)),
                    "zone": node.get("zone", ""),
                    "city": ""
                }
        
        # Create a spatial index for road map lookup
        road_map_nodes = {}
        for node in road_map.get("nodes", []):
            lat = node.get("latitude", 0)
            lon = node.get("longitude", 0)
            city = node.get("city_name", "")
            zone = node.get("zone", "")
            
            # Create a key for spatial lookup
            key = f"{lat:.6f},{lon:.6f}"
            road_map_nodes[key] = {
                "city": city,
                "zone": zone
            }
        
        # Match places to cities using road map
        # Note: place data has coordinates swapped - lat contains longitude, lon contains latitude
        for place_id, place in places.items():
            # Fix coordinate swap issue in place data
            longitude = place.get("lat", 0)  # lat field actually contains longitude
            latitude = place.get("lon", 0)   # lon field actually contains latitude
            
            # Look for exact match first
            key = f"{latitude:.6f},{longitude:.6f}"
            if key in road_map_nodes:
                place["city"] = road_map_nodes[key]["city"]
                if not place["zone"]:
                    place["zone"] = road_map_nodes[key]["zone"]
            else:
                # Find closest match within reasonable distance
                min_distance = float('inf')
                closest_city = ""
                closest_zone = ""
                
                for road_key, road_info in road_map_nodes.items():
                    road_lat, road_lon = map(float, road_key.split(','))
                    distance = ((latitude - road_lat) ** 2 + (longitude - road_lon) ** 2) ** 0.5
                    
                    if distance < min_distance and distance < 0.05:  # Within ~5km (increased tolerance)
                        min_distance = distance
                        closest_city = road_info["city"]
                        closest_zone = road_info["zone"]
                
                place["city"] = closest_city
                if not place["zone"]:
                    place["zone"] = closest_zone
        
        # Extract trip connections for the selected person
        person_trips = []
        
        # First, find all trips for this person
        trip_person_connections = set()
        for edge in data.get("links", []):
            if edge.get("source", "").startswith("trip_") and edge.get("target") == person_id:
                trip_person_connections.add(edge.get("source"))
        
        # Then, find all place connections for these trips
        for trip_id in trip_person_connections:
            if trip_id in trips:
                trip = trips[trip_id]
                trip_places = []
                
                # Find all places connected to this trip
                for edge in data.get("links", []):
                    if edge.get("source") == trip_id and edge.get("target") in places:
                        time_attr = edge.get("time", "")
                        if time_attr:
                            # Fix date format if needed
                            if fix_dates and time_attr.startswith("0040-"):
                                time_attr = time_attr.replace("0040-", "2040-")
                            
                            place_id = edge.get("target")
                            trip_places.append({
                                "place": places[place_id],
                                "time": time_attr
                            })
                
                # Sort places by time
                trip_places.sort(key=lambda x: x["time"])
                trip["places"] = trip_places
                
                if trip_places:  # Only include trips with places
                    person_trips.append(trip)
        
        # Sort trips by date
        person_trips.sort(key=lambda x: x["date"])
        
        # Get unique cities for color mapping
        cities = set()
        for trip in person_trips:
            for place_info in trip["places"]:
                if place_info["place"]["city"]:
                    cities.add(place_info["place"]["city"])
        
        cities = sorted(list(cities))
        
        # Create color mapping for cities
        city_colors = {}
        color_palette = [
            "#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd",
            "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf",
            "#aec7e8", "#ffbb78", "#98df8a", "#ff9896", "#c5b0d5",
            "#c49c94", "#f7b6d3", "#c7c7c7", "#dbdb8d", "#9edae5"
        ]
        
        for i, city in enumerate(cities):
            city_colors[city] = color_palette[i % len(color_palette)]
        
        # Generate fixed meeting dates for all datasets (based on journalist pattern)
        def get_standard_meeting_dates():
            meetings = []
            base_date = datetime.strptime("2040-07-03", "%Y-%m-%d")  # Meeting_13 reference
            
            for meeting_num in range(1, 17):  # Meeting_1 to Meeting_16
                meeting_id = f"Meeting_{meeting_num}"
                
                # Calculate offset from Meeting_13
                if meeting_num <= 8:
                    weeks_offset = meeting_num - 13 - 1  # Extra week earlier for 1-8
                else:
                    weeks_offset = meeting_num - 13  # Standard offset for 9-16
                    
                calculated_date = base_date + timedelta(weeks=weeks_offset)
                actual_date = calculated_date.strftime("%Y-%m-%d")
                
                # Fix date format if needed
                if fix_dates and actual_date.startswith("0040-"):
                    actual_date = actual_date.replace("0040-", "2040-")
                
                meetings.append({
                    "id": meeting_id,
                    "date": actual_date,
                    "label": f"Meeting {meeting_num}"
                })
            
            return meetings
        
        # Use standard meetings for all datasets
        meetings = get_standard_meeting_dates()
        
        return {
            "person": person_nodes[person_id],
            "trips": person_trips,
            "cities": cities,
            "city_colors": city_colors,
            "meetings": meetings,
            "dataset": dataset,
            "fix_dates": fix_dates
        }
        
    except Exception as e:
        return {"error": str(e)}


def get_persons_for_dataset(dataset):
    """
    Helper function to get list of persons for a specific dataset.
    """
    try:
        if dataset == 'FILAH':
            data_file = current_app.config.get("FILAH_FILE")
        elif dataset == 'TROUT':
            data_file = current_app.config.get("TROUT_FILE")
        elif dataset == 'journalist':
            data_file = current_app.config.get("JOURNALIST_FILE")
        else:
            return []
        
        if not data_file or not os.path.exists(data_file):
            return []
        
        with open(data_file, 'r') as f:
            data = json.load(f)
        
        persons = []
        for node in data.get("nodes", []):
            if node.get("type") == "entity.person":
                persons.append({
                    "id": node.get("id"),
                    "name": node.get("name", node.get("id")),
                    "role": node.get("role", "")
                })
        
        return persons
        
    except Exception as e:
        return [] 