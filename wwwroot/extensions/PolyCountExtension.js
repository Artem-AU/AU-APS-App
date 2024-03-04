import { BaseExtension } from "./BaseExtension.js";
import { PolyCountPanel } from "./PolyCountPanel.js";

class PolyCountExtension extends BaseExtension {
    constructor(viewer, options) {
        super(viewer, options);
        this._viewer = viewer;
        this._options = options;
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
                this._panel.drawPanel();

            }
        };
    }

    async onModelLoaded(model) {
        await super.onModelLoaded(model);
    }

    onGeometryLoaded(model) {
        super.onGeometryLoaded(model);

        this.createAggregatedData();
        if (this._panel.isVisible()) {
            this._panel.drawPanel();
        }
    }

    onModelUnloaded(model) {
        super.onModelUnloaded(model); 

        this.createAggregatedData();
        if (this._panel.isVisible()) {
            this._panel.drawPanel();
        }
    }

    createAggregatedData() {
        this.aggregatedData = [];
        for (let [model, targetNodes] of this.targetNodesMap.entries()) {
            const modelName = this.getFileInfo(model, "name");
            const modelData = this.createData(model, targetNodes);
            const modelPolycount = model.getData().instanceTree.fragList.geoms.instancePolyCount;
            this.aggregatedData.push({ modelName, modelData, modelPolycount });
        }
    }

    createData(model, targetNodes) {
        const instanceTree = model.getData().instanceTree;
        const data = {}

        // Iterate over each dbId
        for (const dbId of targetNodes) {
            let dbidPolycount = 0;

            // Get the fragment IDs for each dbId
            instanceTree.enumNodeFragments(dbId, (fragId) => {
                const fragPolyCount = instanceTree.fragList.fragments.polygonCounts[fragId];
                dbidPolycount += fragPolyCount;
            }, true);

            // Get the node name
            const nodeName = instanceTree.getNodeName(dbId);

            // Initialize the data for the name if it doesn't exist
            let cleanName = nodeName.split(/[[\:]/)[0].trim();

            if (!data[cleanName]) {
                data[cleanName] = { instances: 0, polycount: 0, dbids: []};
            }

            // Increment the instance count for the name
            data[cleanName].instances++;

            // Calculate the Name Polycount
            data[cleanName].polycount += dbidPolycount;
            data[cleanName].dbids.push(dbId);
        }
        return data;
    }

}

Autodesk.Viewing.theExtensionManager.registerExtension('PolyCountExtension', PolyCountExtension);