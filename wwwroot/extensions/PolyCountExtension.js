import { BaseExtension } from './BaseExtension.js';
import { PolyCountPanel } from './PolyCountPanel.js'; // Import the PolyCountPanel class

export class PolyCountExtension extends BaseExtension {
    constructor(viewer, options) {
        super(viewer, options);
        this._polyCountButton = null;
        this._polyCountPanel = null; // Add a property for the panel
    }

    async load() {
        super.load();
        await this.loadScript('https://www.gstatic.com/charts/loader.js', 'google.charts'); // Changed from Chart.js to Google Charts
        console.log('PolyCountExtension loaded.');
        return true;
    }

    unload() {
        super.unload();
        if (this._polyCountButton) {
            this.removeToolbarButton(this._polyCountButton);
        }
        this._polyCountButton = null;
        if (this._polyCountPanel) {
            this._polyCountPanel.uninitialize(); // Uninitialize the panel
        }
        this._polyCountPanel = null;
        console.log('PolyCountExtension unloaded.');
        return true;
    }

    onToolbarCreated() {
        this._polyCountPanel = new PolyCountPanel(this, 'polycount-panel', 'PolyCount Report', {
            x: 100,
            y: 100,
            width: 600,
            height: 300
        });

        this._polyCountButton = this.createToolbarButton(
            'polycount-button', 
            'https://cdn1.iconfinder.com/data/icons/commonmat/24/zoomout-256.png', 
            'PolyCount Report', 
            'lightyellow'
        );
        this._polyCountButton.onClick = () => {
            this._polyCountPanel.setVisible(!this._polyCountPanel.isVisible());
            this._polyCountButton.setState(this._polyCountPanel.isVisible() ? Autodesk.Viewing.UI.Button.State.ACTIVE : Autodesk.Viewing.UI.Button.State.INACTIVE);
        };
    }

    onModelLoaded(model) {
        super.onModelLoaded(model);
        if (this._polyCountPanel && this._polyCountPanel.isVisible()) {
            this._polyCountPanel.setModel(model);
        }
    }

    onGeometryLoaded(model) {
        super.onGeometryLoaded(model);
        console.log('Geometry loaded.');
        
        // let totalTriCount = 0;

        // // Get the fragment IDs for each dbId
        // model.getData().instanceTree.enumNodeFragments(dbId, (fragId) => {
        //     // Get the triangle count for each fragment
        //     const renderProxy = this.viewer.impl.getRenderProxy(model, fragId);

        //     if (renderProxy && renderProxy.geometry) {
        //         const polyCount = renderProxy.geometry.polyCount;
        //         totalTriCount += polyCount;
        //     }
        // }, true);


    
    }

}

Autodesk.Viewing.theExtensionManager.registerExtension('PolyCountExtension', PolyCountExtension);