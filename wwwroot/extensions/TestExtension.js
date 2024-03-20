import { BaseExtension } from './BaseExtension.js';
import { TestPanel } from './TestPanel.js';

class TestExtension extends BaseExtension {
    constructor(viewer, options) {
        super(viewer, options);
        this._button = null;
        this._panel = null;
    }

    async load() {
        super.load();
        console.log('TestExtension loaded.');
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
        return true;
    }

    onToolbarCreated() {
        this._panel = new TestPanel(this, 'test-panel', 'Property Histogram', { x: 10, y: 50 });

        this._button = this.createToolbarButton('test-button', 'https://cdn0.iconfinder.com/data/icons/phosphor-light-vol-4/256/test-tube-light-64.png', 'Property Histogram (Bar Chart)', 'lightsalmon');
        this._button.onClick = async () => {
            this._panel.setVisible(!this._panel.isVisible());
            this._button.setState(this._panel.isVisible() ? Autodesk.Viewing.UI.Button.State.ACTIVE : Autodesk.Viewing.UI.Button.State.INACTIVE);
            if (this._panel.isVisible()) {
                this.runPythonScript();
            }
        };
    }

    async onModelLoaded(model) {
        await super.onModelLoaded(model);

        console.log('---LoggerExtension.js onModelLoaded model:', model);
        console.log('---LoggerExtension.js onModelLoaded this.viewer:', this.viewer);
        console.log('---LoggerExtension.js onModelLoaded this.viewer.impl:', this.viewer.impl);
        console.log('---LoggerExtension.js onModelLoaded THREE:', THREE);
        let options = {
            // quantil: 0.75,
            // center: new THREE.Vector3(0, 0, 0),
            // ignoreTransforms: false,
            // allowlist: [0, 1, 2, 3]
        };

        let fuzzyBox = model.getFuzzyBox(options);
        console.log('---LoggerExtension.js onModelLoaded fuzzyBox:', fuzzyBox);

        // Get the size of the bounding box
        let size = fuzzyBox.getSize(new THREE.Vector3());

        // Get the center of the bounding box
        let center = fuzzyBox.getCenter(new THREE.Vector3());

        // Create a semi-transparent material
        let material = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.3 });


        // Create two BoxGeometries with half the depth of the original box
        let geometry1 = new THREE.BoxGeometry(size.x, size.y, size.z / 2);
        let geometry2 = new THREE.BoxGeometry(size.x, size.y, size.z / 2);

        // Create two meshes with the geometries and material
        let mesh1 = new THREE.Mesh(geometry1, material);
        let mesh2 = new THREE.Mesh(geometry2, material);

        // Position the meshes so they appear as two halves of the original box
        mesh1.position.z = center.z - size.z / 4;
        mesh2.position.z = center.z + size.z / 4;

        // Create edges helpers from the meshes
        let edges1 = new THREE.EdgesHelper(mesh1, 0x000000);
        let edges2 = new THREE.EdgesHelper(mesh2, 0x000000);

        this.viewer.impl.createOverlayScene('custom-overlay');

        // Add the meshes and edges to the overlay
        this.viewer.impl.addOverlay('custom-overlay', mesh1);
        this.viewer.impl.addOverlay('custom-overlay', edges1);
        this.viewer.impl.addOverlay('custom-overlay', mesh2);
        this.viewer.impl.addOverlay('custom-overlay', edges2);
    }

    async onModelUnloaded(model) {
        super.onModelUnloaded(model);
    }

    runPythonScript() {
        fetch('http://localhost:8080/run-script')
            .then(response => response.text())
            .then(data => console.log(data))
            .catch((error) => {
                console.error('Error:', error);
            });
    }
}

Autodesk.Viewing.theExtensionManager.registerExtension('TestExtension', TestExtension);