import { BaseExtension } from './BaseExtension.js';
import { TestPanel } from './TestPanel.js';

class TestExtension extends BaseExtension {
    constructor(viewer, options) {
        super(viewer, options);
        this.targetNodes = [];  // Initialize targetNodes in the constructor
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

    async createDataTable(dbIds) {
        // Get the property set for the dbIds
        const propertySet = await this.viewer.model.getPropertySetAsync(dbIds);

        this.dataTableHeaders = [];

        // Add a header for each key in the map
        Object.keys(propertySet.map).forEach(key => {
            if (!key.startsWith('_')) {
                this.dataTableHeaders.push(key);
            }
        });

        // Create a new map with 'dbId' as the key
        const flippedPropertySet = {};
        for (const [key, values] of Object.entries(propertySet.map)) {
            for (const value of values) {
                if (!flippedPropertySet[value.dbId]) {
                    flippedPropertySet[value.dbId] = {};
                }
                flippedPropertySet[value.dbId][key] = value.displayValue;
            }
        }


        // Create an array to hold the rows
        this.dataTable = [this.dataTableHeaders];

        // Iterate over each key-value pair in the flippedPropertySet
        for (const [dbId, values] of Object.entries(flippedPropertySet)) {
            // Create a new row object with dbId as the first property
            var row = {dbId: parseInt(dbId)};
            Object.keys(propertySet.map).forEach(key => {
                if (!key.startsWith('_')) {
                    // Add the corresponding value from the flippedPropertySet to the row
                    var displayValue = values[key] || '';
                    row[key] = String(displayValue);  // Convert the displayValue to a string
                }
            });

            // Add the row to the rows array
            this.dataTable.push(row);
        }

        console.log('---Data from createDataTable:', this.dataTable);
    }

    onToolbarCreated () {
        this._panel = new TestPanel(this, 'test-panel', 'Test Report', { x: 50, y: 100});
        this._button = this.createToolbarButton('test-button', 'https://cdn0.iconfinder.com/data/icons/phosphor-regular-vol-4/256/test-tube-64.png', 'Test', "red");
        this._button.onClick = () => {
            this._panel.setVisible(!this._panel.isVisible());
            this._button.setState(this._panel.isVisible() ? Autodesk.Viewing.UI.Button.State.ACTIVE : Autodesk.Viewing.UI.Button.State.INACTIVE);
            if (this._panel.isVisible() && this.viewer.model) {
                console.log("Should draw dashboard ");
    
                // Update the panel
                this._panel.createTable();
                console.log("Panel updated FROM BUTTON");

                // Draw the column filter only if it hasn't been drawn yet
                if (!this._panel.columnFilterDrawn) {
                    console.log("Should draw column filter");
                    this._panel.drawColumnFilter();
                    // this._panel.drawValueFilter("Item/Name");
                    this._panel.columnFilterDrawn = true;
                }

                // Draw the column filter only if it hasn't been drawn yet
                if (!this._panel.columnKeyFilterDrawn) {
                    console.log("Should draw column filter");
                    // this._panel.drawColumnFilter();
                    this._panel.drawColumnKeyFilter();
                    this._panel.columnKeyFilterDrawn = true;
                }

                // Draw the column filter only if it hasn't been drawn yet
                if (!this._panel.valueFilterDrawn) {
                    console.log("Should draw column filter");
                    // this._panel.drawColumnFilter();
                    this._panel.drawValueFilter("Item/Name");
                    this._panel.valueFilterDrawn = true;
                }
    
            }
        };
    }

    // async onModelLoaded(model) { 
    //     super.onModelLoaded(model);

    //     this.targetNodes = await this.findTargetNodes(model);  
    //     console.log('Found target nodes:', this.targetNodes);  // Log the found target nodes
    //     console.log('this in onModelLoaded:', this);  // Log the this object in onModelLoaded

    //     this.createDataTable(this.targetNodes);  // Call the createDataTable method (defined below



    //     // Get the property set for the target nodes
    //     const propertySet = await this.viewer.model.getPropertySetAsync(this.targetNodes);

    //     this.dataTableHeaders = [];

    //     // Add a header for each key in the map
    //     Object.keys(propertySet.map).forEach(key => {
    //         if (!key.startsWith('_')) {
    //             this.dataTableHeaders.push(key);
    //         }
    //     });

    //     // Create a new map with 'dbId' as the key
    //     const flippedPropertySet = {};
    //     for (const [key, values] of Object.entries(propertySet.map)) {
    //         for (const value of values) {
    //             if (!flippedPropertySet[value.dbId]) {
    //                 flippedPropertySet[value.dbId] = {};
    //             }
    //             flippedPropertySet[value.dbId][key] = value.displayValue;
    //         }
    //     }

    //     // Create an array to hold the rows
    //     this.dataTable = [this.dataTableHeaders];

    //     // Iterate over each key-value pair in the flippedPropertySet
    //     for (const [dbId, values] of Object.entries(flippedPropertySet)) {
    //         // Create a new row object with dbId as the first property
    //         var row = {dbId: parseInt(dbId)};
    //         Object.keys(propertySet.map).forEach(key => {
    //             if (!key.startsWith('_')) {
    //                 // Add the corresponding value from the flippedPropertySet to the row
    //                 var displayValue = values[key] || '';
    //                 row[key] = String(displayValue);  // Convert the displayValue to a string
    //             }
    //         });

    //         // Add the row to the rows array
    //         this.dataTable.push(row);
    //     }

    //     console.log('---Data:', this.dataTable);
    // }



    // Add a method to get the googleDataTable
    

    async onModelLoaded(model) { 
        super.onModelLoaded(model);

        this.targetNodes = await this.findTargetNodes(model);  
        console.log('Found target nodes:', this.targetNodes);  // Log the found target nodes
        console.log('this in onModelLoaded:', this);  // Log the this object in onModelLoaded

        // Create the dataTable from the targetNodes
        await this.createDataTable(this.targetNodes);
    }
    
    getDataTable() {
        return this.dataTable;
    }

    // onSelectionChanged(model, dbids) {
    //     // Call the parent method
    //     super.onSelectionChanged(model, dbids);

    //     console.log('Selection has changed', dbids);
    //     console.log('Target nodes:', this.targetNodes);
    //     console.log('this in onSelectionChanged:', this);  // Log the this object in onSelectionChanged


    //     // Filter the targetNodes array by the selected dbId values if the toggle is on
    //     let filteredTargetNodes = this.isFilterBySelectedEnabled
    //     ? this.targetNodes.filter(nodeDbId => dbids.includes(nodeDbId))
    //     : this.targetNodes;

    //     // Log the filtered targetNodes
    //     console.log('Filtered target nodes:', filteredTargetNodes);
    // }


    async onSelectionChanged(model, dbids) {
        // Call the parent method
        super.onSelectionChanged(model, dbids);

        console.log('Selection has changed', dbids);
        console.log('Target nodes:', this.targetNodes);

        // Filter the targetNodes array by the selected dbId values if the toggle is on
        let filteredTargetNodes = this.isFilterBySelectedEnabled
        ? this.targetNodes.filter(nodeDbId => dbids.includes(nodeDbId))
        : this.targetNodes;

        // Log the filtered targetNodes
        console.log('Filtered target nodes:', filteredTargetNodes);

        // Set a filter on the table to only show rows with selected values in the dbId
        this.table.setFilter(row => filteredTargetNodes.includes(row.getData().dbId));
    }




    
}



Autodesk.Viewing.theExtensionManager.registerExtension('TestExtension', TestExtension);