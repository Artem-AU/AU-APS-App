import { BaseExtension } from '../BaseExtension.js';
import { WorkAreaPanel } from './WorkAreaPanel.js';

class WorkAreaExtension extends BaseExtension {
    constructor(viewer, options) {
        super(viewer, options);
        this._button = null;
        this._panel = null;
        this.bBoxMeshes = [];
    }

    async load() {
        super.load();
        console.log('WorkAreaExtension loaded.');

        // Create a permanent overlay
        this.viewer.impl.createOverlayScene('perm-overlay');

        return true;
    }

    unload() {
        super.unload();
        for (const button of [this._button]) {
            this.removeToolbarButton(button);
        }
        this._button = null;
        for (const panel of [this._panel]) {
            panel.setVisible(false);
            panel.uninitialize();
        }
        this._panel = null;
        console.log('WorkAreaExtension unloaded.');

        // Clear the permanent overlay
        this.viewer.impl.clearOverlay('perm-overlay');
        
        return true;
    }

    onToolbarCreated() {
        this._panel = new WorkAreaPanel(this, 'workarea-panel', 'Work-Area Setup', { x: 10, y: 50 });

        this._button = this.createToolbarButton('workarea-button', 'https://cdn0.iconfinder.com/data/icons/basic-content/24/_elements-64.png', 'Work-Area', 'lightseagreen');
        this._button.onClick = async () => {
            this._panel.setVisible(!this._panel.isVisible());
            this._button.setState(this._panel.isVisible() ? Autodesk.Viewing.UI.Button.State.ACTIVE : Autodesk.Viewing.UI.Button.State.INACTIVE);
            // if (this._panel.isVisible()) {

            // }
        };
    }

    async onModelLoaded(model) {
        await super.onModelLoaded(model);
        
        this.dbIdToCOG = this.createDbIdToCOG();

        // this.createBoxesFromLevels(model.myData.bbox, this.viewer.getExtension('Autodesk.AEC.LevelsExtension'))
    }

    async onModelUnloaded(model) {
        super.onModelUnloaded(model);
    }

    onSelectionChanged(model, dbids) {
        super.onSelectionChanged(model, dbids);
        const aggregateSelection = this.viewer.getAggregateSelection();

        // Check if aggregateSelection[0] is defined
        if (aggregateSelection[0]) {
        
            // Create a constant for the selected model
            this.selectedModel = aggregateSelection[0].model;

            if (this._panel.modelSelectionSwitch.checked) {

                this.createBboxFromFragments();

                const workAreaToDbIds = this.createWorkAreaToDbIds();

                // Extract dbids array
                this.workAreaDbIds = workAreaToDbIds.undefined;

                // Get property set for the dbids
                this.selectedModel.getPropertySetAsync(this.workAreaDbIds, { ignoreHidden: true })
                    .then(propertySet => {
                        // Get the select elements
                        let valueDropdown = document.getElementById('valueDropdown');

                        // Get the keys from the property set map
                        let keys = Object.keys(propertySet.map);

                        // Filter out keys that start with "_"
                        let filteredKeys = keys.filter(key => !key.startsWith('_'));

                        // Create a new option element for each key
                        filteredKeys.forEach((key, index) => {
                            let option = document.createElement('option');
                            option.value = key;
                            option.text = key;
                            // Set the first option as selected
                            if (index === 0) {
                                option.selected = true;
                            }
                            this._panel.propertyDropdown.appendChild(option);
                        });

                        // Add an event listener to the property dropdown
                        this._panel.propertyDropdown.addEventListener('change', function() {
                            // Clear the value dropdown
                            valueDropdown.innerHTML = '';

                            // Get the selected key
                            let selectedKey = this.value;

                            // Get the values for the selected key
                            let values = propertySet.map[selectedKey];

                            // Remove duplicates by converting to a Set and back to an Array
                            let uniqueValues = Array.from(new Set(values.map(value => value.displayValue)));

                            // Create a new option element for each unique value
                            uniqueValues.forEach((displayValue, index) => {
                                let option = document.createElement('option');
                                option.value = displayValue;
                                option.text = displayValue;
                                // Set the first option as selected
                                if (index === 0) {
                                    option.selected = true;
                                }
                                valueDropdown.appendChild(option);
                            });


                            // // Initialize Select2 on the value dropdown
                            // $(valueDropdown).select2().trigger('change');

                        });

                        // Trigger the 'change' event of the propertyDropdown
                        this._panel.propertyDropdown.dispatchEvent(new Event('change'));

                        // Trigger the 'change' event of the propertyDropdown
                        valueDropdown.dispatchEvent(new Event('change'));


                    });
            }
        }
    }

    onShowAll(ev) {
        // Handle show all event
        if (this.bBoxMeshes && this.bBoxMeshes.length > 0) {
            this._panel.hideMappedSwitch.checked = false;
        }
    }

    createBboxFromFragments() {
        let modelToFragIdsMap = this.getFragmentsForSelection();
        modelToFragIdsMap.forEach((fragIds, model) => {
            let options = {
                quantil: 1,
                allowlist: fragIds
            };

            let fuzzyBox = model.getFuzzyBox(options);

            // Get the size of the bounding box
            let size = fuzzyBox.getSize(new THREE.Vector3());

            // Get the center of the bounding box
            let center = fuzzyBox.getCenter(new THREE.Vector3());

            // Create a semi-transparent material
            let material = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.3 });

            // Create a BoxGeometry with the size of the original box
            let geometry = new THREE.BoxGeometry(size.x, size.y, size.z);

            // Create a mesh with the geometry and material
            this.tempBboxMesh = new THREE.Mesh(geometry, material);

            // Position the mesh at the center of the original box
            this.tempBboxMesh.position.copy(center);

            // Create an edges helper from the mesh
            let edges = new THREE.EdgesHelper(this.tempBboxMesh, 0x000000);

            this.viewer.impl.createOverlayScene('temp-overlay');

            // Add the mesh and edges to the overlay
            this.viewer.impl.addOverlay('temp-overlay', this.tempBboxMesh);
            this.viewer.impl.addOverlay('temp-overlay', edges);
        });
    }

    // createBoxesFromLevels(bbox, levelsExtension) {
    //     let boxes = [];

    //     // Get the min and max x, y values from the bounding box
    //     let min = bbox.min;
    //     let max = bbox.max;

    //     // Create an overlay scene
    //     this.viewer.impl.createOverlayScene('levels-overlay');

    //     // Get the levels
    //     let levels = levelsExtension.aecModelData.levels;

    //     // Iterate over all levels
    //     for (let levelIndex = 0; levelIndex < levels.length; levelIndex++) {
    //         // Get the current level
    //         let currentLevel = levels[levelIndex];

    //         // Use the min z value from the bounding box for the first level, and the elevation of the current level for the other levels
    //         let minZ = levelIndex === 0 ? min.z : currentLevel.elevation;

    //         // Use the elevation of the next level (or the max z value from the bounding box if there is no next level) as the max z value
    //         let maxZ = levelIndex < levels.length - 1 ? levels[levelIndex + 1].elevation : max.z;

    //         // Create a BoxGeometry with the min and max x, y, z values
    //         let geometry = new THREE.BoxGeometry(max.x - min.x, max.y - min.y, maxZ - minZ);

    //         // Create a semi-transparent material
    //         let material = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.3 });

    //         // Create a mesh with the geometry and material
    //         let box = new THREE.Mesh(geometry, material);

    //         // Position the box at the center of the min and max x, y, z values
    //         box.position.set((min.x + max.x) / 2, (min.y + max.y) / 2, minZ + (maxZ - minZ) / 2);

    //         // Add the box to the array
    //         boxes.push(box);

    //         // Create an edges helper from the box
    //         let edges = new THREE.EdgesHelper(box, 0x000000);

    //         // Add the box and edges to the overlay
    //         this.viewer.impl.addOverlay('levels-overlay', box);
    //         this.viewer.impl.addOverlay('levels-overlay', edges);
    //     }

    //     return boxes;
    // }

    getCOG(dbId) {
        const instanceTree = this.viewer.model.getInstanceTree();
        let fragIds = [];

        instanceTree.enumNodeFragments(dbId, function (fragId) {
            fragIds.push(fragId);
        }, true);

        let options = {
            quantil: 1,
            allowlist: fragIds
        };

        let fuzzyBox = this.viewer.model.getFuzzyBox(options);

        // Get the center of the bounding box
        let center = fuzzyBox.getCenter(new THREE.Vector3());

        return center;
    }

    createDbIdToCOG() {
        
        // Create an empty object to store the dbIds and their COGs
        let dbIdToCOG = {};

        // Iterate over the values of targetNodesMap
        for (const model of this.targetNodesMap.values()) {
            // Iterate over the items in each value
            for (const dbId of model) {
                const cog = this.getCOG(dbId);

                // Add the dbId and its COG to the object
                dbIdToCOG[dbId] = cog;
            }
        }

        // Return the dbIdToCOG object
        return dbIdToCOG;
    }

    createWorkAreaToDbIds() {
        // Create an empty object to store the workAreas and their dbIds
        const workAreaToDbIds = {};

        // Create a bounding box from the mesh object
        const box = new THREE.Box3().setFromObject(this.tempBboxMesh);

        // // // Initialize the work area with an empty array
        workAreaToDbIds[this.tempBboxMesh.workArea] = [];

        // Iterate over the entries of this.extension.dbIdToCOG
        for (const [dbId, cog] of Object.entries(this.dbIdToCOG)) {
            // Check if the COG is contained within the box
            if (box.containsPoint(cog)) {
                // Add the dbId to the array under the corresponding workArea
                workAreaToDbIds[this.tempBboxMesh.workArea].push(Number(dbId)); 
            }
        }

        // Return the workAreaToDbIds object
        return workAreaToDbIds;
    }

    // Download IFC data as a file
    downloadIfc(data, filename) {
        const blob = new Blob([data], { type: 'application/octet-stream' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', filename);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
    
    runPythonScript(paramsArray) {
        const SERVER_URL = window.location.hostname.includes('localhost') ? 'http://localhost:8080' : 'https://au-aps-app.azurewebsites.net';

        // console.log("SERVER_URL:", SERVER_URL);
        // console.log("paramsArray:", paramsArray);
        // console.log("JSON stringified paramsArray:", JSON.stringify(paramsArray));

        fetch(`${SERVER_URL}/run-script`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(paramsArray),
        })
        .then(response => response.blob())
        .then(blob => {
            const filename = 'model.ifc';
            this.downloadIfc(blob, filename);
        })
        .catch((error) => {
            console.error('Error:', error);
        });
    }
}

Autodesk.Viewing.theExtensionManager.registerExtension('WorkAreaExtension', WorkAreaExtension);