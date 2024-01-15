import { BaseExtension } from "./BaseExtension.js";
import { TestPanel } from "./TestPanel.js";

class TestExtension extends BaseExtension {
    constructor(viewer, options) {
        super(viewer, options);
        this._viewer = viewer;
        this._options = options;
        this.tableData = {}
        // Initialize dataTablePromise and resolveDataTable
        this.dataTablePromise = new Promise((resolve) => {
            this.resolveDataTable = resolve;
        });

        // Initialize googleDataTable as null
        this.googleDataTable = null;

        // Load the Google Charts library and set a callback to be executed once it's loaded
        google.charts.load('current', {'packages':['table', "gauge"]});
        google.charts.setOnLoadCallback(() => this.isGoogleChartsLoaded = true);
    }

    load() {
        super.load();
        // this.viewer.addEventListener(Autodesk.Viewing.OBJECT_TREE_CREATED_EVENT, () => console.log('TestExtension: OBJECT_TREE_CREATED_EVENT fired'));
        // this.viewer.addEventListener(Autodesk.Viewing.GEOMETRY_LOADED_EVENT, () => console.log('TestExtension: GEOMETRY_LOADED_EVENT fired'));
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
        console.log('TestExtension unloaded.');
        return true;
    }

    onToolbarCreated() {
        this._panel = new TestPanel(this, 'dashboard-test-panel', 'Test', { x: 10, y: 50});
        this._button = this.createToolbarButton('dashboard-test-button', 'https://cdn1.iconfinder.com/data/icons/creative-commons-5/20/outline_miscellaneous-close-64.png', 'Test', "lightgreen");
        this._button.onClick = () => {
            this._panel.setVisible(!this._panel.isVisible());
            this._button.setState(this._panel.isVisible() ? Autodesk.Viewing.UI.Button.State.ACTIVE : Autodesk.Viewing.UI.Button.State.INACTIVE);
            if (this._panel.isVisible() && this.viewer.model) {
                this._panel.updatePanel();
            }
        };
    }

    onModelLoaded(model) {
        super.onModelLoaded(model);
        console.log('---TEST New model has been loaded.');
    }


    async onGeometryLoaded(model) {
        super.onGeometryLoaded(model);
        console.log('---TEST Geometry has been loaded.');

        const targetNodes = await this.findTargetNodes(model);
        console.log('---TEST targetNodes', targetNodes);

        // Get the instance tree
        const instanceTree = model.getData().instanceTree;

        // Initialize nameData object
        // let tableData = {};

        // Create a new DataTable
        this.googleDataTable = new google.visualization.DataTable();

        // Define the columns
        this.googleDataTable.addColumn('string', 'Name');
        this.googleDataTable.addColumn('number', 'Instances');
        this.googleDataTable.addColumn('number', 'Polycount');

        // Iterate over each dbId
        for (const dbId of targetNodes) {
            let totalTriCount = 0;

            // Get the fragment IDs for each dbId
            instanceTree.enumNodeFragments(dbId, (fragId) => {
                // Get the triangle count for each fragment
                const renderProxy = this.viewer.impl.getRenderProxy(model, fragId);

                if (renderProxy && renderProxy.geometry) {
                    const polyCount = renderProxy.geometry.polyCount;
                    totalTriCount += polyCount;
                }
            }, true);

            // Get the node name
            const nodeName = instanceTree.getNodeName(dbId);

            // Initialize the data for the name if it doesn't exist
            let cleanName = nodeName.split(/[[\:]/)[0].trim();

            if (!this.tableData[cleanName]) {
                this.tableData[cleanName] = { instances: 0, polycount: 0, dbids: [] };
            }

            // Increment the instance count for the name
            this.tableData[cleanName].instances++;

            // Calculate the Name Polycount
            this.tableData[cleanName].polycount += totalTriCount;

            this.tableData[cleanName].dbids.push(dbId);

            // // Add a row for each unique name
            // this.googleDataTable.addRow([cleanName, this.tableData[cleanName].instances, this.tableData[cleanName].polycount]);
        }

        // Iterate over each unique name
        for (const cleanName in this.tableData) {
            // Add a row for each unique name
            this.googleDataTable.addRow([cleanName, this.tableData[cleanName].instances, this.tableData[cleanName].polycount]);
}

        // Resolve the promise
        this.resolveDataTable();

        console.log('---TEST polyCounts', this.tableData);
        console.log('---TEST googleDataTable', this.googleDataTable);
    }        
}

Autodesk.Viewing.theExtensionManager.registerExtension('TestExtension', TestExtension);