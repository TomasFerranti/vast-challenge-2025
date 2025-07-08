"""
Challenge 2 - Question 2 Visualization
Boxplot visualization of sentiment by industry for entity.person related to plans/discussions
"""

import json
import os
from flask import current_app
import numpy as np

TITLE = "Question 2: COOTEFOO Committee Bias Analysis"
DESCRIPTION = "Analyze sentiment patterns by industry to understand potential bias in the COOTEFOO committee"

def get_data(**params):
    """
    Get sentiment data grouped by industry for boxplot visualization.
    Returns data formatted for D3 boxplot visualization.
    """
    try:
        # Use Flask app configuration to get the correct file path
        filepath = current_app.config.get("JOURNALIST_FILE")
        
        if not filepath or not os.path.exists(filepath):
            return {"error": f"journalist.json file not found at {filepath}"}
        
        with open(filepath, 'r') as f:
            data = json.load(f)
        
        # Collect nodes and edges (JSON uses "links" instead of "edges")
        all_nodes = {}
        all_edges = data.get("links", [])  # Changed from "edges" to "links"
        
        # Create lookup for nodes
        for node in data.get("nodes", []):
            all_nodes[node.get("id")] = node
        
        # Extract sentiment data by industry, ensuring uniqueness
        sentiment_by_industry = {}
        total_participant_edges = 0
        valid_sentiment_edges = 0
        
        # Track unique combinations to avoid duplicates
        unique_combinations = set()
        
        for edge in all_edges:
            # Only consider edges where role is "participant" and target is entity.person
            if edge.get("role") == "participant":
                total_participant_edges += 1
                
                target_id = edge.get("target")
                if target_id in all_nodes and all_nodes[target_id].get("type") == "entity.person":
                    sentiment = edge.get("sentiment")
                    industry_list = edge.get("industry", [])
                    reason = edge.get("reason")
                    
                    # Skip if sentiment is null or industry is null/empty
                    if sentiment is not None and industry_list and reason:
                        person_name = all_nodes[target_id].get("name", target_id)
                        
                        for industry in industry_list:
                            # Create unique key: person + reason + industry
                            unique_key = (person_name, reason, industry)
                            
                            # Only add if this combination hasn't been seen before
                            if unique_key not in unique_combinations:
                                unique_combinations.add(unique_key)
                                valid_sentiment_edges += 1
                                
                                if industry not in sentiment_by_industry:
                                    sentiment_by_industry[industry] = []
                                
                                sentiment_by_industry[industry].append({
                                    "sentiment": sentiment,
                                    "reason": reason,
                                    "person": person_name,
                                    "source": edge.get("source"),
                                    "unique_key": f"{person_name}|{reason}|{industry}"  # For debugging
                                })
        
        # Calculate boxplot statistics for each industry
        boxplot_data = []
        
        for industry, sentiments in sentiment_by_industry.items():
            values = [s["sentiment"] for s in sentiments]
            if len(values) > 0:
                values_array = np.array(values)
                
                # Calculate boxplot statistics
                q1 = float(np.percentile(values_array, 25))
                median = float(np.percentile(values_array, 50))
                q3 = float(np.percentile(values_array, 75))
                iqr = q3 - q1
                
                # Calculate outliers (values outside 1.5*IQR)
                lower_fence = q1 - 1.5 * iqr
                upper_fence = q3 + 1.5 * iqr
                
                # Filter out outliers for whiskers
                non_outliers = [v for v in values if lower_fence <= v <= upper_fence]
                min_val = float(min(non_outliers)) if non_outliers else float(min(values))
                max_val = float(max(non_outliers)) if non_outliers else float(max(values))
                
                # Find outliers
                outliers = [float(v) for v in values if v < lower_fence or v > upper_fence]
                
                boxplot_data.append({
                    "industry": industry,
                    "min": min_val,
                    "q1": q1,
                    "median": median,
                    "q3": q3,
                    "max": max_val,
                    "outliers": outliers,
                    "count": len(values),
                    "mean": float(np.mean(values_array)),
                    "std": float(np.std(values_array)),
                    "details": sentiments  # Include all sentiment details
                })
        
        # Sort by industry name for consistent ordering
        boxplot_data.sort(key=lambda x: x["industry"])
        
        # Calculate overall statistics
        all_sentiments = []
        total_entries = 0
        for industry_data in boxplot_data:
            all_sentiments.extend([s["sentiment"] for s in industry_data["details"]])
            total_entries += industry_data["count"]
        
        overall_mean = float(np.mean(all_sentiments)) if all_sentiments else 0
        overall_std = float(np.std(all_sentiments)) if all_sentiments else 0
        
        # Debug information
        debug_info = {
            "filepath_used": filepath,
            "total_nodes": len(all_nodes),
            "total_edges": len(all_edges),
            "total_participant_edges": total_participant_edges,
            "valid_sentiment_edges": valid_sentiment_edges,
            "unique_combinations": len(unique_combinations),
            "industries_found": list(sentiment_by_industry.keys()),
            "boxplot_entries": len(boxplot_data)
        }
        
        return {
            "boxplot_data": boxplot_data,
            "overall_stats": {
                "mean": overall_mean,
                "std": overall_std,
                "total_entries": total_entries,
                "industries_count": len(boxplot_data)
            },
            "debug": debug_info
        }
        
    except Exception as e:
        import traceback
        return {"error": str(e), "traceback": traceback.format_exc()} 