import { BaseExtension } from './BaseExtension.js';
import { TestPanel } from './TestPanel.js';

class TestExtension extends BaseExtension {
    constructor(viewer, options) {
        super(viewer, options);
    }

    load() {
        super.load();
        console.log('TestExtension loaded.');
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


    onToolbarCreated () {
        this._panel = new TestPanel(this, 'test-panel', 'Test Report', { x: 50, y: 100});
        this._button = this.createToolbarButton('test-button', 'https://cdn0.iconfinder.com/data/icons/phosphor-regular-vol-4/256/test-tube-64.png', 'Test', "red");
        this._button.onClick = () => {
            this._panel.setVisible(!this._panel.isVisible());
            this._button.setState(this._panel.isVisible() ? Autodesk.Viewing.UI.Button.State.ACTIVE : Autodesk.Viewing.UI.Button.State.INACTIVE);
            if (this._panel.isVisible() && this.viewer.model) { // Combine all conditions
                console.log("Should draw dashboard ");

                // Create the new elements
                this._panel.createTable();
                this._panel.createColumnSelector();
                this._panel.createToggle();
            }
        };
    }

    async onModelLoaded(model) {
        this.tableData = await this.createData();
    }

    async createData() {
        const targetNodes = await this.findTargetNodes(this.viewer.model);
        // Get the property set for the dbIds
        const propertySet = await this.viewer.model.getPropertySetAsync(targetNodes);

        // Step 1: Create an empty array to hold the rows of the table
        let rows = [];

        // Step 2: Create column definitions
        let columns = Object.keys(propertySet.map).map(key => {
            return {title: key, field: key};
        });

        // Step 3 and 4: Create rows
        for (let key in propertySet.map) {
            propertySet.map[key].forEach(item => {
                // Find the row for this dbId, or create a new one if it doesn't exist
                let row = rows.find(r => r.dbId === item.dbId);
                if (!row) {
                    row = {dbId: item.dbId};
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
        // Call the parent method
        super.onSelectionChanged(model, dbids);

        console.log('---Selection has changed', dbids);

        // Log the state of the toggle
        let isToggleOn = this._panel.settingsToggleDiv.classList.contains('on');
        console.log('---Toggle state', isToggleOn);

        // If the toggle is on and there are selected dbIds, filter the table to only show rows with these dbIds
        if (isToggleOn && dbids.length > 0) {
            this._panel.table.setFilter("dbId", "in", dbids);
        } else {
            // If the toggle is off or there are no selected dbIds, clear the filter
            this._panel.table.clearFilter();
        }
    }
    
}



Autodesk.Viewing.theExtensionManager.registerExtension('TestExtension', TestExtension);