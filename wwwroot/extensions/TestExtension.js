import { BaseExtension } from './BaseExtension.js';
import { TestPanel } from './TestPanel.js';

class TestExtension extends BaseExtension {
    constructor(viewer, options) {
        super(viewer, options);
        this._button = null;
        this._panel = null;
        this.bBoxMeshes = [];
    }

    async load() {
        super.load();
        console.log('TestExtension loaded.');

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
        console.log('TestExtension unloaded.');

        // Clear the permanent overlay
        this.viewer.impl.clearOverlay('perm-overlay');
        
        return true;
    }

    onToolbarCreated() {
        this._panel = new TestPanel(this, 'test-panel', 'Work-Area Setup', { x: 10, y: 50 });

        this._button = this.createToolbarButton('test-button', 'https://cdn0.iconfinder.com/data/icons/phosphor-light-vol-4/256/test-tube-light-64.png', 'Property Histogram (Bar Chart)', 'lightsalmon');
        this._button.onClick = async () => {
            this._panel.setVisible(!this._panel.isVisible());
            this._button.setState(this._panel.isVisible() ? Autodesk.Viewing.UI.Button.State.ACTIVE : Autodesk.Viewing.UI.Button.State.INACTIVE);
            // if (this._panel.isVisible()) {
            //     this.runPythonScript(10, 3, 0.1);
            // }

            // if (this._panel.isVisible()) {
                // Get the dimensions of the geometry
                // let params = this.mesh.geometry.parameters;
                // console.log('---LoggerExtension.js onToolbarCreated params:', params.width, params.depth / 2, params.height);
                // this.runPythonScript(params.width, params.depth, params.height);
            // }
        };
    }

    async onModelLoaded(model) {
        await super.onModelLoaded(model);

        // this.createBoxesFromLevels(model.myData.bbox, this.viewer.getExtension('Autodesk.AEC.LevelsExtension'))
    }

    async onModelUnloaded(model) {
        super.onModelUnloaded(model);
    }

    onSelectionChanged(model, dbids) {
        super.onSelectionChanged(model, dbids);

        // let modelToFragIdsMap = this.getFragmentsForSelection();
        // console.log("--- getFragmentsForModels:", modelToFragIdsMap);

        if (this._panel.selectObjectsButton.classList.contains('on')) {
            // do something

            this.createBboxFromFragments();
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
            console.log('---LoggerExtension.js createMeshesFromFragments fuzzyBox:', fuzzyBox);

            // Get the size of the bounding box
            let size = fuzzyBox.getSize(new THREE.Vector3());

            // Get the center of the bounding box
            let center = fuzzyBox.getCenter(new THREE.Vector3());

            // Create a semi-transparent material
            let material = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.3 });

            // Create a BoxGeometry with the size of the original box
            let geometry = new THREE.BoxGeometry(size.x, size.y, size.z);

            console.log('---LoggerExtension.js createMeshesFromFragments geometry:', geometry);

            // Create a mesh with the geometry and material
            this.tempBboxMesh = new THREE.Mesh(geometry, material);

            console.log('---LoggerExtension.js createMeshesFromFragments mesh:', this.tempBboxMesh);

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

    createBoxesFromLevels(bbox, levelsExtension) {
        let boxes = [];

        // Get the min and max x, y values from the bounding box
        let min = bbox.min;
        let max = bbox.max;

        // Create an overlay scene
        this.viewer.impl.createOverlayScene('levels-overlay');

        // Get the levels
        let levels = levelsExtension.aecModelData.levels;

        // Iterate over all levels
        for (let levelIndex = 0; levelIndex < levels.length; levelIndex++) {
            // Get the current level
            let currentLevel = levels[levelIndex];

            // Use the min z value from the bounding box for the first level, and the elevation of the current level for the other levels
            let minZ = levelIndex === 0 ? min.z : currentLevel.elevation;

            // Use the elevation of the next level (or the max z value from the bounding box if there is no next level) as the max z value
            let maxZ = levelIndex < levels.length - 1 ? levels[levelIndex + 1].elevation : max.z;

            // Create a BoxGeometry with the min and max x, y, z values
            let geometry = new THREE.BoxGeometry(max.x - min.x, max.y - min.y, maxZ - minZ);

            // Create a semi-transparent material
            let material = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.3 });

            // Create a mesh with the geometry and material
            let box = new THREE.Mesh(geometry, material);

            // Position the box at the center of the min and max x, y, z values
            box.position.set((min.x + max.x) / 2, (min.y + max.y) / 2, minZ + (maxZ - minZ) / 2);

            // Add the box to the array
            boxes.push(box);

            // Create an edges helper from the box
            let edges = new THREE.EdgesHelper(box, 0x000000);

            // Add the box and edges to the overlay
            this.viewer.impl.addOverlay('levels-overlay', box);
            this.viewer.impl.addOverlay('levels-overlay', edges);
        }

        console.log('---TestExtension.js createBoxesFromLevels boxes:', boxes);

        return boxes;
    }


    // runPythonScript(length, height, thickness) {
    //     fetch(`http://localhost:8080/run-script?length=${length}&height=${height}&thickness=${thickness}`)
    //         .then(response => response.text())
    //         .then(data => console.log(data))
    //         .catch((error) => {
    //             console.error('Error:', error);
    //         });
    // }

    runPythonScript(paramsArray) {
        console.log("paramsArray:", paramsArray);
        console.log("JSON stringified paramsArray:", JSON.stringify(paramsArray));

        fetch('http://localhost:8080/run-script', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(paramsArray),
        })
        .then(response => response.text())
        .then(data => console.log(data))
        .catch((error) => {
            console.error('Error:', error);
        });
    }
}

Autodesk.Viewing.theExtensionManager.registerExtension('TestExtension', TestExtension);