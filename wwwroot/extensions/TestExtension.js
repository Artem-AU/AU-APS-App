import { BaseExtension } from './BaseExtension.js';
import { TestPanel } from './TestPanel.js';
// import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';
// import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
// import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

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
                this.runPythonScript(10, 3, 0.5);
            }

            // // Call the exportToObj function with the defined meshes
            // if (this.mesh1 && this.mesh2) {
            //     let objFile1 = this.exportToObj(this.mesh1);
            //     let objFile2 = this.exportToObj(this.mesh2);
            //     console.log(objFile1);
            //     console.log(objFile2);
            // } else {
            //     console.error('Meshes are not defined');
            // }
        };
    }

    // exportToObj(mesh) {
    //     let objFile = '';
    //     let position = mesh.geometry.attributes.position;
    //     let index = mesh.geometry.index;

    //     // Write vertices
    //     for (let i = 0; i < position.count; i++) {
    //         let x = position.getX(i);
    //         let y = position.getY(i);
    //         let z = position.getZ(i);
    //         objFile += `v ${x} ${y} ${z}\n`;
    //     }

    //     // Write faces
    //     for (let i = 0; i < index.count; i += 3) {
    //         let a = index.getX(i) + 1;
    //         let b = index.getX(i + 1) + 1;
    //         let c = index.getX(i + 2) + 1;
    //         objFile += `f ${a} ${b} ${c}\n`;
    //     }

    //     return objFile;
    // }

    async onModelLoaded(model) {
        await super.onModelLoaded(model);

        // console.log('---LoggerExtension.js onModelLoaded model:', model);
        // console.log('---LoggerExtension.js onModelLoaded this.viewer:', this.viewer);
        // console.log('---LoggerExtension.js onModelLoaded this.viewer.impl:', this.viewer.impl);
        // console.log('---LoggerExtension.js onModelLoaded THREE:', THREE);
        // // console.log('---LoggerExtension.js onModelLoaded THREE.OBJExporter:', THREE.OBJExporter);
        // // let exporter = new THREE.OBJExporter();
        // // console.log('---LoggerExtension.js onModelLoaded exporter:', exporter);


        // let options = {
        //     // quantil: 0.75,
        //     // center: new THREE.Vector3(0, 0, 0),
        //     // ignoreTransforms: false,
        //     // allowlist: [0, 1, 2, 3]
        // };

        // let fuzzyBox = model.getFuzzyBox(options);
        // console.log('---LoggerExtension.js onModelLoaded fuzzyBox:', fuzzyBox);

        // // Get the size of the bounding box
        // let size = fuzzyBox.getSize(new THREE.Vector3());

        // // Get the center of the bounding box
        // let center = fuzzyBox.getCenter(new THREE.Vector3());

        // // Create a semi-transparent material
        // let material = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.3 });


        // // Create two BoxGeometries with half the depth of the original box
        // let geometry1 = new THREE.BoxGeometry(size.x, size.y, size.z / 2);
        // let geometry2 = new THREE.BoxGeometry(size.x, size.y, size.z / 2);

        // // Create two meshes with the geometries and material
        // this.mesh1 = new THREE.Mesh(geometry1, material);
        // this.mesh2 = new THREE.Mesh(geometry2, material);

        // // Position the meshes so they appear as two halves of the original box
        // this.mesh1.position.z = center.z - size.z / 4;
        // this.mesh2.position.z = center.z + size.z / 4;

        // // Create edges helpers from the meshes
        // let edges1 = new THREE.EdgesHelper(this.mesh1, 0x000000);
        // let edges2 = new THREE.EdgesHelper(this.mesh2, 0x000000);

        // this.viewer.impl.createOverlayScene('custom-overlay');

        // // Add the meshes and edges to the overlay
        // this.viewer.impl.addOverlay('custom-overlay', this.mesh1);
        // this.viewer.impl.addOverlay('custom-overlay', edges1);
        // this.viewer.impl.addOverlay('custom-overlay', this.mesh2);
        // this.viewer.impl.addOverlay('custom-overlay', edges2);
    }

    async onModelUnloaded(model) {
        super.onModelUnloaded(model);
    }

    runPythonScript(length, height, thickness) {
        fetch(`http://localhost:8080/run-script?length=${length}&height=${height}&thickness=${thickness}`)
            .then(response => response.text())
            .then(data => console.log(data))
            .catch((error) => {
                console.error('Error:', error);
            });
    }
}

Autodesk.Viewing.theExtensionManager.registerExtension('TestExtension', TestExtension);