"""
Meetups Visualization for VAST Challenge 2025 Mini-Challenge 2
Shows intersections where multiple people are at the same place and time
"""

import json
import os
from flask import current_app
from collections import defaultdict
from datetime import datetime, timedelta
import numpy as np

TITLE = "Meetups: People Intersections Timeline"
DESCRIPTION = "Interactive timeline showing where and when multiple people intersect at the same locations"

def get_data(**params):
    """
    Get data for meetups visualization.
    Returns intersection data for all people in the selected dataset.
    """
    try:
        # Get parameters
        dataset = params.get('dataset', 'journalist')
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
        persons = {}
        for node in data.get("nodes", []):
            if node.get("type") == "entity.person":
                persons[node.get("id")] = {
                    "id": node.get("id"),
                    "name": node.get("name", node.get("id")),
                    "role": node.get("role", "")
                }
        
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
                    
                    if distance < min_distance and distance < 0.05:  # Within ~5km
                        min_distance = distance
                        closest_city = road_info["city"]
                        closest_zone = road_info["zone"]
                
                place["city"] = closest_city
                if not place["zone"]:
                    place["zone"] = closest_zone
        
        # Build person-trip connections and extract all person-place-time combinations
        person_locations = defaultdict(list)  # person_id -> [(datetime, place_info), ...]
        
        # First, find all trips for each person
        person_trips = defaultdict(set)
        for edge in data.get("links", []):
            if edge.get("source", "").startswith("trip_") and edge.get("target") in persons:
                person_trips[edge.get("target")].add(edge.get("source"))
        
        # Then, find all place connections for these trips
        for person_id, trip_ids in person_trips.items():
            for trip_id in trip_ids:
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
                                datetime_obj = datetime.strptime(time_attr, "%Y-%m-%d %H:%M:%S")
                                
                                person_locations[person_id].append({
                                    "datetime": datetime_obj,
                                    "date": datetime_obj.date(),
                                    "hour": datetime_obj.hour,
                                    "place": places[place_id],
                                    "trip_id": trip_id
                                })
        
        # Find intersections: group by date/hour/place and find where >1 person is present
        location_groups = defaultdict(lambda: defaultdict(lambda: defaultdict(set)))  # date -> hour -> place_id -> {person_ids}
        
        for person_id, locations in person_locations.items():
            for location in locations:
                date_key = location["date"].strftime("%Y-%m-%d")
                hour = location["hour"]
                place_id = location["place"]["id"]
                
                location_groups[date_key][hour][place_id].add(person_id)
        
        # Extract meetups (intersections with >1 person)
        meetups = []
        for date_str, hours_data in location_groups.items():
            for hour, places_data in hours_data.items():
                for place_id, person_ids in places_data.items():
                    if len(person_ids) > 1:  # More than one person at this location
                        meetups.append({
                            "date": date_str,
                            "hour": hour,
                            "place": places[place_id],
                            "people": [persons[pid] for pid in person_ids],
                            "person_count": len(person_ids)
                        })
        
        # Sort meetups by date and hour
        meetups.sort(key=lambda x: (x["date"], x["hour"]))
        
        # Get unique cities for color mapping
        cities = set()
        for meetup in meetups:
            if meetup["place"]["city"]:
                cities.add(meetup["place"]["city"])
        
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
            "meetups": meetups,
            "people": list(persons.values()),
            "cities": cities,
            "city_colors": city_colors,
            "meetings": meetings,
            "dataset": dataset,
            "fix_dates": fix_dates
        }
        
    except Exception as e:
        return {"error": str(e)} 