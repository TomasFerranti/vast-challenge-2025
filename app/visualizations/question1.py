"""
Challenge 2 - Question 1 Visualization
Sentiment Heatmap for bias analysis between FILAH and TROUT datasets
"""

import json
import os
from flask import current_app
from collections import defaultdict
import numpy as np

TITLE = "Question 1: Sentiment Bias Analysis"
DESCRIPTION = "Analyze sentiment bias in FILAH vs TROUT datasets to identify potential bias in member actions"

def get_data(**params):
    """
    Get data for Question 1 sentiment heatmap visualization.
    Returns sentiment data aggregated by entity and industry.
    """
    try:
        # Get dataset parameter (defaults to FILAH)
        dataset = params.get('dataset', 'FILAH')
        
        # Load the appropriate dataset
        if dataset == 'FILAH':
            data_file = current_app.config.get("FILAH_FILE")
        elif dataset == 'TROUT':
            data_file = current_app.config.get("TROUT_FILE")
        else:
            return {"error": "Invalid dataset. Use 'FILAH' or 'TROUT'"}
        
        if not data_file or not os.path.exists(data_file):
            return {"error": f"{dataset} data file not found"}
        
        with open(data_file, 'r') as f:
            data = json.load(f)
        
        # Extract entities (people and organizations) from nodes
        entities = {}
        for node in data.get("nodes", []):
            if node.get("type") in ["entity.person", "entity.organization"]:
                entities[node.get("id")] = {
                    "name": node.get("name", node.get("id")),
                    "type": node.get("type"),
                    "role": node.get("role", "")
                }
        
        # Process sentiment data from links
        sentiment_data = defaultdict(lambda: defaultdict(list))
        unique_entries = set()  # To remove duplicates based on reason/sentiment
        
        for link in data.get("links", []):
            if (link.get("role") == "participant" and 
                link.get("sentiment") is not None and 
                link.get("industry") is not None and
                link.get("target") in entities):
                
                entity_id = link.get("target")
                sentiment = link.get("sentiment")
                reason = link.get("reason", "")
                industries = link.get("industry", [])
                
                # Create unique key to avoid duplicates
                unique_key = (entity_id, sentiment, reason)
                if unique_key not in unique_entries:
                    unique_entries.add(unique_key)
                    
                    # Add sentiment for each industry
                    for industry in industries:
                        if industry:  # Skip empty industries
                            sentiment_data[entity_id][industry].append({
                                "sentiment": sentiment,
                                "reason": reason
                            })
        
        # Calculate mean sentiments and prepare heatmap data
        heatmap_data = []
        industries = ["small vessel", "large vessel", "tourism"]
        
        # Sort entities: people first, then organizations
        sorted_entities = []
        for entity_id, entity_info in entities.items():
            if entity_id in sentiment_data:
                sorted_entities.append((entity_id, entity_info))
        
        # Sort by type (person first) then by name
        sorted_entities.sort(key=lambda x: (x[1]["type"], x[1]["name"]))
        
        for entity_id, entity_info in sorted_entities:
            entity_sentiments = sentiment_data[entity_id]
            
            for industry in industries:
                sentiments = entity_sentiments.get(industry, [])
                if sentiments:
                    # Calculate mean sentiment
                    mean_sentiment = np.mean([s["sentiment"] for s in sentiments])
                    reasons = [s["reason"] for s in sentiments if s["reason"]]
                    
                    heatmap_data.append({
                        "entity": entity_info["name"],
                        "entity_id": entity_id,
                        "entity_type": entity_info["type"],
                        "entity_role": entity_info.get("role", ""),
                        "industry": industry,
                        "sentiment": round(mean_sentiment, 2),
                        "count": len(sentiments),
                        "reasons": reasons[:3]  # Top 3 reasons
                    })
                else:
                    # No data for this entity-industry combination
                    heatmap_data.append({
                        "entity": entity_info["name"],
                        "entity_id": entity_id,
                        "entity_type": entity_info["type"],
                        "entity_role": entity_info.get("role", ""),
                        "industry": industry,
                        "sentiment": None,
                        "count": 0,
                        "reasons": []
                    })
        
        # Get unique entities for axis labels
        unique_entities = []
        seen_entities = set()
        for item in heatmap_data:
            if item["entity_id"] not in seen_entities:
                unique_entities.append({
                    "id": item["entity_id"],
                    "name": item["entity"],
                    "type": item["entity_type"],
                    "role": item["entity_role"]
                })
                seen_entities.add(item["entity_id"])
        
        return {
            "heatmap_data": heatmap_data,
            "entities": unique_entities,
            "industries": industries,
            "dataset": dataset,
            "total_entities": len(unique_entities),
            "total_entries": len([d for d in heatmap_data if d["sentiment"] is not None])
        }
        
    except Exception as e:
        return {"error": str(e)} 