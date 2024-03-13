import { BaseExtension } from './BaseExtension.js';
import { IddPipelinePanel } from './IddPipelinePanel.js';

class IddPipelineExtension extends BaseExtension {
    constructor(viewer, options) {
        super(viewer, options);
    }

    async load() {
        super.load();
        await Promise.all([
            this.loadScript('https://unpkg.com/tabulator-tables@4.9.3/dist/js/tabulator.min.js', 'Tabulator'),
            this.loadStylesheet('https://unpkg.com/tabulator-tables@4.9.3/dist/css/tabulator.min.css')
        ]);
        console.log('IddPipelineExtension loaded.');
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
        console.log('Idd Pipeline Extension unloaded.');
        return true;
    }

    onToolbarCreated () {
        this._panel = new IddPipelinePanel(this, 'iddPipeline-panel', 'IDD Pipeline Report', { x: 20, y: 50});
        this._button = this.createToolbarButton('iddPipeline-button', 'https://cdn1.iconfinder.com/data/icons/social-media-marketing/64/video-production-process-timeline-procedure-256.png', 'IDD Pipeline', "lightcoral");
        this._button.onClick = () => {
            this._panel.setVisible(!this._panel.isVisible());
            this._button.setState(this._panel.isVisible() ? Autodesk.Viewing.UI.Button.State.ACTIVE : Autodesk.Viewing.UI.Button.State.INACTIVE);
            if (this._panel.isVisible() && this.viewer.model) { // Combine all conditions

                // Create the new elements
                this._panel.createTable();
                this._panel.createColumnSelector();
                this._panel.createToggle();
                this._panel.createUpdateButton();

            }
        };
    }

    async onModelLoaded(model) {
        await super.onModelLoaded(model);
        await this.createAggregatedData();
    }

    async onModelUnloaded(model) {
        super.onModelUnloaded(model);
        await this.createAggregatedData();
    }

    async createAggregatedData() {
        let allData = await Promise.all(
            Array.from(this.targetNodesMap.entries()).map(async ([model, dbIds]) => {
                return this.createData(model, dbIds);
            })
        );
        // Merge all data frames into one
        let mergedData = {
            columns: [],
            rows: []
        };
        allData.forEach(data => {
            // Merge columns
            mergedData.columns = [...mergedData.columns, ...data.columns.filter(column => !mergedData.columns.find(c => c.field === column.field))];
            // Concatenate rows
            mergedData.rows = [...mergedData.rows, ...data.rows];
        });

        this.tableData = mergedData;
    }

    async createData(model, targetNodes) {
        // Get the property set for the dbIds
        const propertySet = await model.getPropertySetAsync(targetNodes);
        console.log("--- createData propertySet", propertySet);
        // Step 1: Create an empty array to hold the rows of the table
        let rows = [];
        // Step 2: Create column definitions
        let columns = Object.keys(propertySet.map)
            .filter(key => !key.startsWith("_"))
            .map(key => {
                return {title: key, field: key};
        });

        // Define the order of columns
        let columnOrder = ['IFC/GLOBALID',
                            "IFC/NAME",
                            'Item/Type',
                            "IFC/PREDEFINEDTYPE",
                            "IFC/OBJECTTYPE",
                            "Item/Source File",
        ];

        // Sort columns based on the order in columnOrder, "LoadBearing" columns, and "IsExternal" columns
        columns.sort((a, b) => {
            let indexA = columnOrder.indexOf(a.title);
            let indexB = columnOrder.indexOf(b.title);

            if (indexA === -1 && a.title.includes("LoadBearing")) indexA = columnOrder.length;
            if (indexB === -1 && b.title.includes("LoadBearing")) indexB = columnOrder.length;

            if (indexA === -1 && a.title.includes("IsExternal")) indexA = columnOrder.length + 1;
            if (indexB === -1 && b.title.includes("IsExternal")) indexB = columnOrder.length + 1;

            if (indexA === -1 && a.title.includes("IsExternal")) indexA = columnOrder.length + 1;
            if (indexB === -1 && b.title.includes("IsExternal")) indexB = columnOrder.length + 1;

            if (indexA === -1) indexA = Infinity; // if a.title is not in columnOrder and doesn't include "LoadBearing" or "IsExternal", it should come last
            if (indexB === -1) indexB = Infinity; // if b.title is not in columnOrder and doesn't include "LoadBearing" or "IsExternal", it should come last

            return indexA - indexB;
        });

        console.log("--- createData columns", columns);

        // Add "Model" column at the beginning of the columns array
        const modelName = this.getFileInfo(model, 'name');
        // columns.unshift({title: 'Model', field: 'model'});

        // // Add "Model-DbId" column
        // columns.push({title: 'Model-DbId', field: 'modelDbId'});

        // Step 3 and 4: Create rows
        for (let key in propertySet.map) {
            propertySet.map[key].forEach(item => {
                // Find the row for this dbId, or create a new one if it doesn't exist
                let row = rows.find(r => r.dbId === item.dbId);
                if (!row) {
                    row = {dbId: item.dbId, model: modelName, modelDbId: `${modelName}=${item.dbId}`};
                    rows.push(row);
                }

                // Add the displayValue to the row
                row[key] = item.displayValue;
            });
        }
        // Create the data table object
        let data = {
            columns: columns,
            rows: rows
        };


        return data;
    }

    getTableData() {
        return this.tableData;
    }

    async onSelectionChanged(model, dbids) {
        // Check if the panel is visible and the toggle is on
        if (this._panel.isVisible() && this._panel.settingsToggleButton.classList.contains('on')) {
            const aggregateSelection = this.viewer.getAggregateSelection();

            let isToggleOn = this._panel.settingsToggleButton.classList.contains('on');

            // If the toggle is on and there are selected items in the aggregate selection
            if (isToggleOn && aggregateSelection.some(selection => selection.selection.length > 0)) {
                // Create an array of modelDbId strings for each model:dbId pair in the aggregateSelection
                const modelDbIds = aggregateSelection.flatMap(selection => 
                    selection.selection.map(dbId => `${this.getFileInfo(selection.model, 'name')}=${dbId}`)
                );

                // Assign modelDbIds to combinedFilters.selectionFilter
                this._panel.combinedFilters.selectionFilter = modelDbIds;
            } else {

                // Also clear the selectionFilter
                this._panel.combinedFilters.selectionFilter = null;
            }
        }
    }
    
}



Autodesk.Viewing.theExtensionManager.registerExtension('IddPipelineExtension', IddPipelineExtension);