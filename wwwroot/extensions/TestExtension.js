import { BaseExtension } from './BaseExtension.js';
import { TestPanel } from './TestPanel.js';

class TestExtension extends BaseExtension {
    constructor(viewer, options) {
        super(viewer, options);
        this._button = null;
        this._panel = null;
        // Load the Google Charts library and set a callback to be executed once it's loaded
        google.charts.load('current', {packages: ['corechart', 'bar']});
        google.charts.setOnLoadCallback(() => this.isGoogleChartsLoaded = true);
    }

    async load() {
        super.load();
        // await this.loadScript('https://www.gstatic.com/charts/loader.js', 'google.charts'); // Changed from Chart.js to Google Charts
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
        this._panel = new TestPanel(this, 'dashboard-barchart-panel', 'Property Histogram', { x: 10, y: 50, chartType: 'BarChart' });

        this._button = this.createToolbarButton('dashboard-barchart-button', 'https://img.icons8.com/small/32/bar-chart.png', 'Property Histogram (Bar Chart)', 'lightblue');
        this._button.onClick = async () => {
            this._panel.setVisible(!this._panel.isVisible());
            this._button.setState(this._panel.isVisible() ? Autodesk.Viewing.UI.Button.State.ACTIVE : Autodesk.Viewing.UI.Button.State.INACTIVE);
            if (this._panel.isVisible() && this.viewer.model) {
                this._panel.drawMaterial(this._panel.select.value);
                // this._panel.defineChartData();
                // await this.createAggregatedData();
                // this._panel.setModel(this.viewer.model);
            }
        };
    }

    async onModelLoaded(model) {
        await super.onModelLoaded(model);
        await this.createAggregatedData();
        this._panel.defineChartData();
        this._panel.drawDropdown();
        // this._panel.drawMaterial();

    }

    async onModelUnloaded(model) {
        super.onModelUnloaded(model);
        await this.createAggregatedData();
        this._panel.defineChartData();
        this._panel.drawDropdown();
        // this._panel.drawMaterial();
    }

    async findPropertyValueOccurrences(model, propertyName) {
        const dbids = await this.findTargetNodes(model);
        const [displayCategory, displayName] = propertyName.split('/');

        return new Promise(function (resolve, reject) {
            model.getBulkProperties(dbids, { propFilter: [displayCategory, displayName] }, function (results) {
                let histogram = new Map();
                for (const result of results) {
                    if (result.properties.length > 0) {
                        const key = result.properties[0].displayValue;
                        if (histogram.has(key)) {
                            histogram.get(key).push(result.dbId);
                        } else {
                            histogram.set(key, [result.dbId]);
                        }
                    }
                }
                resolve(histogram);
            }, reject);
        });
    }

    async createAggregatedData() {
        this.aggregatedData = new Map();

        const models = [...this.targetNodesMap.keys()]; // Assuming targetNodesMap is a Map where keys are models

        for (const model of models) {
            const data = await this.createData(model, this.targetNodesMap.get(model));
            for (const [key, value] of data.entries()) {
                this.aggregatedData.set(key, value);
            }
        }

        console.log('---createAggregatedData this.aggregatedData:', this.aggregatedData);
        // Continue with your code...
    }

    async createData(model, targetNodes) {
        const instanceTree = model.getData().instanceTree;
        console.log('---createData instanceTree:', instanceTree);

        const propertySet = await model.getPropertySetAsync(targetNodes);
        console.log('---createData propertySet:', propertySet);

        // Use a Map instead of an object
        const data = new Map();
        data.set(model, propertySet);

        console.log('---createData data:', data);
        return data;
    }


        // Do something with propertySet

        // // Iterate over each dbId
        // for (const dbId of targetNodes) {
        //     let dbidPolycount = 0;

        //     // Get the fragment IDs for each dbId
        //     instanceTree.enumNodeFragments(dbId, (fragId) => {
        //         const fragPolyCount = instanceTree.fragList.fragments.polygonCounts[fragId];
        //         dbidPolycount += fragPolyCount;
        //     }, true);

        //     // Get the node name
        //     const nodeName = instanceTree.getNodeName(dbId);

        //     // Initialize the data for the name if it doesn't exist
        //     let cleanName = nodeName.split(/[[\:]/)[0].trim();

        //     if (!data[cleanName]) {
        //         data[cleanName] = { instances: 0, polycount: 0, dbids: []};
        //     }

        //     // Increment the instance count for the name
        //     data[cleanName].instances++;

        //     // Calculate the Name Polycount
        //     data[cleanName].polycount += dbidPolycount;
        //     data[cleanName].dbids.push(dbId);
    //     // }
    //     console.log('---createData data:', data);
    //     return data;
    // }
}

Autodesk.Viewing.theExtensionManager.registerExtension('TestExtension', TestExtension);