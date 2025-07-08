"""
Challenge 2 - Question 4 Visualization
Person behavior comparison across different datasets (FILAH, TROUT, journalist)
"""

import json
import os
from flask import current_app
import numpy as np

TITLE = "Question 4: Person Behavior Comparison"
DESCRIPTION = "Compare a person's behavior across different datasets (FILAH, TROUT, journalist) to highlight differences in stories each dataset tells"

def get_data(**params):
    """
    Get data for Question 4 visualization.
    Returns person list and sentiment data for boxplot visualization comparing across datasets.
    """
    try:
        # Load all three datasets
        filah_file = current_app.config.get("FILAH_FILE")
        trout_file = current_app.config.get("TROUT_FILE")
        journalist_file = current_app.config.get("JOURNALIST_FILE")
        
        datasets = {}
        
        # Load each dataset
        for data_file, source_name in [(filah_file, "FILAH"), (trout_file, "TROUT"), (journalist_file, "Journalist")]:
            if not data_file or not os.path.exists(data_file):
                continue
                
            with open(data_file, 'r') as f:
                data = json.load(f)
                
            # Create lookup for nodes
            nodes = {}
            for node in data.get("nodes", []):
                nodes[node.get("id")] = node
            
            datasets[source_name] = {
                "nodes": nodes,
                "links": data.get("links", [])
            }
        
        # Get all entity.person nodes from journalist dataset (complete dataset)
        journalist_nodes = datasets.get("Journalist", {}).get("nodes", {})
        people = []
        
        for node_id, node in journalist_nodes.items():
            if node.get("type") == "entity.person":
                people.append({
                    "id": node_id,
                    "name": node.get("name", node_id),
                    "role": node.get("role", "")
                })
        
        # Sort people by name for consistent ordering
        people.sort(key=lambda x: x["name"])
        
        # Get selected person (default to first person if none selected)
        selected_person = params.get("person")
        if not selected_person and people:
            selected_person = people[0]["id"]
        
        # Extract sentiment data for the selected person across all datasets
        person_sentiment_data = []
        
        if selected_person:
            for dataset_name, dataset_data in datasets.items():
                nodes = dataset_data["nodes"]
                links = dataset_data["links"]
                
                # Check if person exists in this dataset
                if selected_person in nodes:
                    # Find all sentiment edges for this person
                    for edge in links:
                        if (edge.get("role") == "participant" and 
                            edge.get("target") == selected_person and
                            edge.get("sentiment") is not None):
                            
                            industry_list = edge.get("industry", [])
                            sentiment = edge.get("sentiment")
                            reason = edge.get("reason", "")
                            
                            # Add entry for each industry
                            for industry in industry_list:
                                person_sentiment_data.append({
                                    "dataset": dataset_name,
                                    "industry": industry,
                                    "sentiment": sentiment,
                                    "reason": reason,
                                    "source": edge.get("source", ""),
                                    "person": selected_person
                                })
        
        # Create boxplot data by industry/dataset combinations
        boxplot_data = []
        
        # Group sentiment data by industry/dataset combinations
        sentiment_by_combination = {}
        
        for entry in person_sentiment_data:
            # Create combination key: industry + dataset
            combination_key = f"{entry['industry']} ({entry['dataset']})"
            
            if combination_key not in sentiment_by_combination:
                sentiment_by_combination[combination_key] = []
            
            sentiment_by_combination[combination_key].append(entry)
        
        # Calculate boxplot statistics for each combination
        for combination_key, entries in sentiment_by_combination.items():
            values = [entry["sentiment"] for entry in entries]
            
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
                
                # Extract industry and dataset from combination key
                industry = combination_key.split(" (")[0]
                dataset = combination_key.split(" (")[1].replace(")", "")
                
                boxplot_data.append({
                    "combination": combination_key,
                    "industry": industry,
                    "dataset": dataset,
                    "min": min_val,
                    "q1": q1,
                    "median": median,
                    "q3": q3,
                    "max": max_val,
                    "outliers": outliers,
                    "count": len(values),
                    "mean": float(np.mean(values_array)),
                    "std": float(np.std(values_array)),
                    "details": entries
                })
        
        # Sort by combination for consistent ordering
        boxplot_data.sort(key=lambda x: x["combination"])
        
        # Calculate overall statistics
        all_sentiments = []
        total_entries = 0
        for combination_data in boxplot_data:
            all_sentiments.extend([entry["sentiment"] for entry in combination_data["details"]])
            total_entries += combination_data["count"]
        
        overall_mean = float(np.mean(all_sentiments)) if all_sentiments else 0
        overall_std = float(np.std(all_sentiments)) if all_sentiments else 0
        
        # Get person name for display
        person_name = "Unknown"
        if selected_person and selected_person in journalist_nodes:
            person_name = journalist_nodes[selected_person].get("name", selected_person)
        
        # Debug information
        debug_info = {
            "datasets_loaded": list(datasets.keys()),
            "total_people": len(people),
            "selected_person": selected_person,
            "person_name": person_name,
            "total_sentiment_entries": len(person_sentiment_data),
            "unique_combinations": len(sentiment_by_combination),
            "boxplot_entries": len(boxplot_data)
        }
        
        return {
            "people": people,
            "selected_person": selected_person,
            "person_name": person_name,
            "boxplot_data": boxplot_data,
            "overall_stats": {
                "mean": overall_mean,
                "std": overall_std,
                "total_entries": total_entries,
                "combinations_count": len(boxplot_data)
            },
            "debug": debug_info
        }
        
    except Exception as e:
        import traceback
        return {"error": str(e), "traceback": traceback.format_exc()} 