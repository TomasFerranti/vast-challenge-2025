from flask import Flask, render_template, jsonify, request
import importlib
import logging
import os

app = Flask(__name__)

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Suppress numba debug messages
logging.getLogger("numba").setLevel(logging.WARNING)
logging.getLogger("numba.core").setLevel(logging.WARNING)
logging.getLogger("numba.typed").setLevel(logging.WARNING)

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# Challenge 2 data files
app.config["FILAH_FILE"] = os.path.join(base_dir, "data", "FILAH.json")
app.config["TROUT_FILE"] = os.path.join(base_dir, "data", "TROUT.json")
app.config["JOURNALIST_FILE"] = os.path.join(base_dir, "data", "journalist.json")
app.config["OCEANUS_MAP_FILE"] = os.path.join(base_dir, "data", "oceanus_map.geojson")
app.config["ROAD_MAP_FILE"] = os.path.join(base_dir, "data", "road_map.json")

# List of visualization modules for Challenge 2 - 4 questions
VISUALIZATIONS = ["question1", "question2", "question3", "question4"]

# Cache for loaded modules
visualization_modules = {}

def load_visualization_module(viz_name):
    """Lazy load visualization module when needed."""
    if viz_name not in visualization_modules:
        try:
            module = importlib.import_module(f"app.visualizations.{viz_name}")
            visualization_modules[viz_name] = module
            logger.info(f"Loaded visualization module: {viz_name}")
        except ImportError as e:
            logger.error(f"Error loading visualization module {viz_name}: {e}")
            return None
    return visualization_modules.get(viz_name)

@app.route("/")
def index():
    viz_list = []
    for name in VISUALIZATIONS:
        # Try to load module to get metadata
        module = load_visualization_module(name)
        if module:
            viz_list.append(
                {
                    "name": name,
                    "title": getattr(module, "TITLE", name),
                    "description": getattr(module, "DESCRIPTION", ""),
                }
            )
        else:
            logger.warning(f"Visualization {name} could not be loaded")

    logger.debug(
        f"Rendering index with visualizations: {[v['name'] for v in viz_list]}"
    )
    return render_template("index.html", visualizations=viz_list)

@app.route("/viz/<viz_name>")
def visualization(viz_name):
    """Route to serve visualization pages."""
    if viz_name not in VISUALIZATIONS:
        logger.error(f"Visualization not found: {viz_name}")
        return "Visualization not found", 404
    
    # Load module to get metadata
    module = load_visualization_module(viz_name)
    if not module:
        logger.error(f"Failed to load visualization module: {viz_name}")
        return "Visualization module could not be loaded", 500
    
    title = getattr(module, "TITLE", viz_name)
    description = getattr(module, "DESCRIPTION", "")
    
    return render_template(f"{viz_name}.html", title=title, description=description)

@app.route("/data/<viz_name>", methods=["GET", "POST"])
def get_data(viz_name):
    logger.debug(f"Data request for: {viz_name}")

    # Check if visualization name is valid
    if viz_name not in VISUALIZATIONS:
        logger.error(f"Visualization not found: {viz_name}")
        return jsonify({"error": "Visualization not found"}), 404

    # Lazy load the module
    module = load_visualization_module(viz_name)
    if not module:
        logger.error(f"Failed to load visualization module: {viz_name}")
        return jsonify({"error": "Visualization module could not be loaded"}), 500

    try:
        # Extract parameters from both GET and POST requests
        params = {}

        # GET parameters from query string
        params.update(request.args.to_dict())

        # POST parameters from form data or JSON
        if request.method == "POST":
            if request.is_json:
                params.update(request.get_json() or {})
            else:
                params.update(request.form.to_dict())

        # Pass parameters as kwargs to get_data function
        data = module.get_data(**params)

        logger.debug(f"Returning data for {viz_name} with params {params}")
        return jsonify(data)
    except Exception as e:
        logger.exception(f"Error generating data for {viz_name}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True)
