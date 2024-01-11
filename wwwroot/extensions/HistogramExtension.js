import { BaseExtension } from './BaseExtension.js';
import { HistogramPanel } from './HistogramPanel.js';

class HistogramExtension extends BaseExtension {
    constructor(viewer, options) {
        super(viewer, options);
        this._barChartButton = null;
        this._barChartPanel = null;
    }

    async load() {
        super.load();
        await this.loadScript('https://www.gstatic.com/charts/loader.js', 'google.charts'); // Changed from Chart.js to Google Charts
        console.log('HistogramExtension loaded.');
        return true;
    }

    unload() {
        super.unload();
        for (const button of [this._barChartButton]) {
            this.removeToolbarButton(button);
        }
        this._barChartButton = null;
        for (const panel of [this._barChartPanel]) {
            panel.setVisible(false);
            panel.uninitialize();
        }
        this._barChartPanel = null;
        console.log('HistogramExtension unloaded.');
        return true;
    }

    onToolbarCreated() {
        this._barChartPanel = new HistogramPanel(this, 'dashboard-barchart-panel', 'Property Histogram', { x: 10, y: 50, chartType: 'BarChart' });

        this._barChartButton = this.createToolbarButton('dashboard-barchart-button', 'https://img.icons8.com/small/32/bar-chart.png', 'Property Histogram (Bar Chart)', 'lightblue');
        this._barChartButton.onClick = () => {
            this._barChartPanel.setVisible(!this._barChartPanel.isVisible());
            this._barChartButton.setState(this._barChartPanel.isVisible() ? Autodesk.Viewing.UI.Button.State.ACTIVE : Autodesk.Viewing.UI.Button.State.INACTIVE);
            if (this._barChartPanel.isVisible() && this.viewer.model) {
                this._barChartPanel.setModel(this.viewer.model);
            }
        };
    }

    onModelLoaded(model) {
        super.onModelLoaded(model);
        if (this._barChartPanel && this._barChartPanel.isVisible()) {
            this._barChartPanel.setModel(model);
        }
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
}

Autodesk.Viewing.theExtensionManager.registerExtension('HistogramExtension', HistogramExtension);