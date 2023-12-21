import { BaseExtension } from './BaseExtension.js';
import { ReconstructPropsPanel } from './ReconstructPropsPanel.js';

class ReconstructPropsExtension extends BaseExtension {
    constructor(viewer, options) {
        super(viewer, options);
        this._button = null;
        this._panel = null;
    }

    async load() {
        super.load();
        await Promise.all([
            this.loadScript('https://unpkg.com/tabulator-tables@4.9.3/dist/js/tabulator.min.js', 'Tabulator'),
            this.loadStylesheet('https://unpkg.com/tabulator-tables@4.9.3/dist/css/tabulator.min.css')
        ]);
        console.log('ReconstructPropsExtension loaded.');
        return true;
    }

    unload() {
        super.unload();
        if (this._button) {
            this.removeToolbarButton(this._button);
            this._button = null;
        }
        if (this._panel) {
            this._panel.setVisible(false);
            this._panel.uninitialize();
            this._panel = null;
        }
        console.log('ReconstructPropsExtension unloaded.');
        return true;
    }

    onToolbarCreated() {
        this._panel = new ReconstructPropsPanel(this, 'dashboard-reconstructprops-panel', 'Reconstruct Props', { x: 10, y: 10});
        this._button = this.createToolbarButton('dashboard-reconstructprops-button', 'https://cdn2.iconfinder.com/data/icons/picol-vector/32/hierarchy-64.png', 'Reconstruct Props');
        this._button.onClick = () => {
            this._panel.setVisible(!this._panel.isVisible());
            this._button.setState(this._panel.isVisible() ? Autodesk.Viewing.UI.Button.State.ACTIVE : Autodesk.Viewing.UI.Button.State.INACTIVE);
            if (this._panel.isVisible() && this.viewer.model) {
                this.update();
            }
        };
    }

    async onModelLoaded(model) {
        super.onModelLoaded(model);
        if (this._panel && this._panel.isVisible()) {
            this.update();
        }

        // Get the properties of the model
        const props = await this.findPropertyNames(model);

        // Call setupDataGridConfig with the properties
        this._panel.setupDataGridConfig(props);

        // Create the table
        this._panel.createTable();
    }

    async update() {
        const dbids = await this.findLeafNodes(this.viewer.model);
        this._panel.update(this.viewer.model, dbids);
    }
}



Autodesk.Viewing.theExtensionManager.registerExtension('ReconstructPropsExtension', ReconstructPropsExtension);