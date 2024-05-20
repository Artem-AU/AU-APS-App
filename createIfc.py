
import ifcopenshell
from ifcopenshell.api import run
import numpy as np
import sys
import json

# Parse command line arguments
paramsArray = json.loads(sys.argv[1]) if len(sys.argv) > 1 else [{'width': 5, 'height': 3, 'depth': 0.2, 'matrix': np.eye(4).tolist()}]

# # Create a blank model
# model = ifcopenshell.file()

# Create a new IFC4 model
model = ifcopenshell.file(schema="IFC4")

# All projects must have one IFC Project element
project = run("root.create_entity", model, ifc_class="IfcProject", name="My Project")

# Assigning without arguments defaults to metric units
run("unit.assign_unit", model)

# Let's create a modeling geometry context, so we can store 3D geometry
context = run("context.add_context", model, context_type="Model")

# In particular, in this example we want to store the 3D "body" geometry of objects, i.e. the body shape
body = run("context.add_context", model, context_type="Model",
    context_identifier="Body", target_view="MODEL_VIEW", parent=context)

# Create a site, building, and storey. Many hierarchies are possible.
site = run("root.create_entity", model, ifc_class="IfcSite", name="My Site")
building = run("root.create_entity", model, ifc_class="IfcBuilding", name="Building A")
storey = run("root.create_entity", model, ifc_class="IfcBuildingStorey", name="Ground Floor")

# Since the site is our top level location, assign it to the project
# Then place our building on the site, and our storey in the building
run("aggregate.assign_object", model, relating_object=project, product=site)
run("aggregate.assign_object", model, relating_object=site, product=building)
run("aggregate.assign_object", model, relating_object=building, product=storey)

for params in paramsArray:
    length = params['width']
    height = params['depth']
    thickness = params['height']
    zone = params.get('zone', '')  # Use an empty string as the default value
    subzone = params.get('subzone', '')  # Use an empty string as the default value
    workArea = params.get('workArea', '')  # Use an empty string as the default value

    print(f"Creating a wall with length {length}, height {height}, thickness {thickness}, zone {zone}, subzone {subzone}, workArea {workArea}")

    # ... rest of the code ...

    # Let's create a new wall
    wall = run("root.create_entity", model, ifc_class="IfcWall")

    # Convert the matrix list to a numpy array
    matrix = np.round(np.array(params['matrix']).T, 6)
    
    # Set the wall's object placement using the matrix
    run("geometry.edit_object_placement", model, product=wall, matrix=matrix, is_si=True)

    # Add a new wall-like body geometry
    representation = run("geometry.add_wall_representation", model, context=body, length=length, height=height, thickness=thickness)

    # Assign our new body geometry back to our wall
    run("geometry.assign_representation", model, product=wall, representation=representation)

    # Place our wall in the ground floor
    run("spatial.assign_container", model, relating_structure=storey, product=wall)

    # Create a new property set for the wall
    pset = run("pset.add_pset", model, product=wall, name="Pset_PDS")

    # Add the zone, subzone, and workArea properties to the property set
    run("pset.edit_pset", model, pset=pset, properties={"Zone": zone, "Subzone": subzone, "WorkArea": workArea})


# # Write out to a file
# model.write("model.ifc")