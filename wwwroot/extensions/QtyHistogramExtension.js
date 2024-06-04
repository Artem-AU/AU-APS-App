import { BaseExtension } from './BaseExtension.js';
import { QtyHistogramPanel } from './QtyHistogramPanel.js';

class QtyHistogramExtension extends BaseExtension {
    constructor(viewer, options) {
        super(viewer, options);
        this._button = null;
        this._panel = null;
        // Load the Google Charts library and set a callback to be executed once it's loaded
        google.charts.load('current', {packages: ['corechart', 'bar']});
    }

    async load() {
        await super.load();
        console.log('QtyHistogramExtension loaded.');

        await this.createAggregatedData();

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
        console.log('QtyHistogramExtension unloaded.');
        return true;
    }

    onToolbarCreated() {
        this._panel = new QtyHistogramPanel(this, 'qty-histogram-panel', 'Quantity Histogram', { x: 10, y: 50 });

        this._button = this.createToolbarButton('qty-histogram-button', 'https://cdn3.iconfinder.com/data/icons/sports-55/24/Weight_Machine-64.png', 'Quantity Histogram (Bar Chart)', 'lightsalmon');
        this._button.onClick = async () => {
            this._panel.setVisible(!this._panel.isVisible());
            this._button.setState(this._panel.isVisible() ? Autodesk.Viewing.UI.Button.State.ACTIVE : Autodesk.Viewing.UI.Button.State.INACTIVE);
            if (this._panel.isVisible()) {
                this._panel.drawDropdown();
                this._panel.drawChart(this._panel.selectProp.value, this._panel.selectQty.value);
            }
        };
    }

    async onModelLoaded(model) {
        await super.onModelLoaded(model);
        await this.createAggregatedData();
        this._panel.drawDropdown();
        if (this._panel.isVisible()) {
            this._panel.drawChart(this._panel.selectProp.value, this._panel.selectQty.value);
        }

    }

    async onModelUnloaded(model) {
        super.onModelUnloaded(model);
        await this.createAggregatedData();
        this._panel.drawDropdown();
        if (this._panel.isVisible()) {
            this._panel.drawChart(this._panel.selectProp.value, this._panel.selectQty.value);
        }
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

    }

    async createData(model, targetNodes) {
        const propertySet = await model.getPropertySetAsync(targetNodes);

        // Use a Map instead of an object
        const data = new Map();
        data.set(model, propertySet);

        return data;
    }
}

Autodesk.Viewing.theExtensionManager.registerExtension('QtyHistogramExtension', QtyHistogramExtension);