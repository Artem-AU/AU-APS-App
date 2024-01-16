import { BaseExtension } from "./BaseExtension.js";
import { PolyCountPanel } from "./PolyCountPanel.js";

class PolyCountExtension extends BaseExtension {
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
        this.totalPolyCount = 0;
        // Load the Google Charts library and set a callback to be executed once it's loaded
        google.charts.load('current', {'packages':['table', "gauge"]});
        google.charts.setOnLoadCallback(() => this.isGoogleChartsLoaded = true);
    }

    load() {
        super.load();
        console.log('PolyCountExtension loaded.');
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
        console.log('PolyCountExtension unloaded.');
        return true;
    }

    onToolbarCreated() {
        this._panel = new PolyCountPanel(this, 'dashboard-test-panel', 'PolyCount Report', { x: 50, y: 100});
        this._button = this.createToolbarButton('dashboard-test-button', 'https://cdn1.iconfinder.com/data/icons/web-con-set-117-line/128/polygons_plane-figure_geometrical_pentagon_hexagon_quadrilateral_side_vertex_polygram_two-dimension-64.png', 'PolyCount report by Category', "lightyellow");
        this._button.onClick = () => {
            this._panel.setVisible(!this._panel.isVisible());
            this._button.setState(this._panel.isVisible() ? Autodesk.Viewing.UI.Button.State.ACTIVE : Autodesk.Viewing.UI.Button.State.INACTIVE);
            if (this._panel.isVisible() && this.viewer.model) {
                this._panel.updatePanel();
            }
        };
    }

    async onGeometryLoaded(model) {
        super.onGeometryLoaded(model);

        const targetNodes = await this.findTargetNodes(model);

        // Get the instance tree
        const instanceTree = model.getData().instanceTree;

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

        }

        // Iterate over each item in tableData
        for (let name in this.tableData) {
            // Add a row for each item
            this.googleDataTable.addRow([name, this.tableData[name].instances, this.tableData[name].polycount]);
        }

        // Resolve the promise
        this.resolveDataTable();
        
        this.totalPolyCount = model.instancePolyCount();
    }        
}

Autodesk.Viewing.theExtensionManager.registerExtension('PolyCountExtension', PolyCountExtension);