import { BaseExtension } from './BaseExtension.js';
import { BulkPropsPanel } from './BulkPropsPanel.js';

class BulkPropsExtension extends BaseExtension {
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
        console.log('BulkPropsExtension loaded.');
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
        console.log('BulkPropsExtension unloaded.');
        return true;
    }

    onToolbarCreated() {
        this._panel = new BulkPropsPanel(this, 'dashboard-bulkprops-panel', 'Bulk Properties', { x: 10, y: 50});
        this._button = this.createToolbarButton('dashboard-bulkprops-button', 'https://cdn0.iconfinder.com/data/icons/infographic-element-8/512/26_Diagram-64.png', 'Bulk Props', "lightgreen");
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

        const fileName = this.getFileInfo(model, "name");

        // Pass the fileName to the panel
        if (this._panel) {
            this._panel.setFileName(fileName);
        }
        
        if (this._panel && this._panel.isVisible()) {
            this.update();
        }

        // Get the properties of the model
        const props = await this.findPropertyNames(model);
        // Get the existing dropdown with the properties
        const dropdown = document.getElementById('property-dropdown');
        $(dropdown).select2(); // Initialize Select2 on your dropdown
        props.forEach(prop => {
            const option = document.createElement('option');
            option.value = prop;
            option.text = prop;
            dropdown.appendChild(option);
        });

        $(dropdown).on('change', async () => {
            // Get the currently selected options
            let selectedOptions = $(dropdown).select2('data').map(option => option.text);

            // If the user cleared the selection, set selectedOptions to all properties
            if (selectedOptions.length === 0) {
                selectedOptions = props;
            }

            // Update the data grid configuration and table with the selected options
            this._panel.setupDataGridConfig(selectedOptions);
            this._panel.createTable();

            // Update the table with the new data
            await this.update();
        });

        // Get the selected options from the dropdown
        const selectedOptions = $(dropdown).select2('data').map(option => option.text);

        // Call setupDataGridConfig with the properties
        this._panel.setupDataGridConfig(props);

        // Create the table
        this._panel.createTable();
    }

    async update() {
        const dbids = await this.findTargetNodes(this.viewer.model);
        this._panel.update(this.viewer.model, dbids);
    }
}

Autodesk.Viewing.theExtensionManager.registerExtension('BulkPropsExtension', BulkPropsExtension);