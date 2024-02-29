
export class TestPanel extends Autodesk.Viewing.UI.DockingPanel {
    constructor(extension, id, title, options) {
        super(extension.viewer.container, id, title, options);
        this.extension = extension;
        this.container.style.right = (options.x || 0) + 'px';
        this.container.style.top = (options.y || 0) + 'px';
        this.container.style.width = (options.width || 900) + 'px';
        this.container.style.height = (options.height || 300) + 'px';
        // Load the Google Charts library and set a callback to be executed once it's loaded
        google.charts.load('current', {'packages':['table', "gauge"]});
        google.charts.setOnLoadCallback(() => this.isGoogleChartsLoaded = true);
        
    }

    initialize() {
        this.title = this.createTitleBar(this.titleLabel || this.container.id);
        this.initializeMoveHandlers(this.title);
        this.container.appendChild(this.title);
        this.dashboardDiv = document.createElement('div');
        this.container.appendChild(this.dashboardDiv);
        let titleHeight = this.title.offsetHeight;
        this.dashboardDiv.style.height = `calc(100% - ${titleHeight}px)`;
        this.dashboardDiv.style.display = 'flex';
        this.dashboardDiv.style.flexDirection = 'row';

        this.tableDiv = document.createElement('div');
        this.tableDiv.id = 'chart_div';
        this.tableDiv.textContent = 'Chart Div';
        this.tableDiv.style.backgroundColor = 'red';
        this.tableDiv.style.height = '250px';  
        this.tableDiv.style.flex = '2.5';
        this.dashboardDiv.appendChild(this.tableDiv);

        this.gaugeDiv = document.createElement('div');
        this.gaugeDiv.id = 'gauge_div';
        this.gaugeDiv.textContent = 'Gauge Div';
        this.gaugeDiv.style.backgroundColor = 'lightsteelblue';
        this.gaugeDiv.style.height = '250px';
        this.gaugeDiv.style.flex = '1';
        this.gaugeDiv.style.display = 'flex';
        this.gaugeDiv.style.justifyContent = 'center';
        this.gaugeDiv.style.alignItems = 'center';
        this.dashboardDiv.appendChild(this.gaugeDiv);
    }

    defineTableData() {
        this.tableData = new google.visualization.DataTable();
        this.tableData.addColumn('string', 'Model');
        this.tableData.addColumn('string', 'Name');
        this.tableData.addColumn('number', 'Instances');
        this.tableData.addColumn('number', 'Polycount');

        for (let item of this.extension.aggregatedData) {
            for (let [name, data] of Object.entries(item.modelData)) {
                this.tableData.addRow([item.modelName, name, data.instances, data.polycount]);
            }
        }
    }
        
    

    

    drawTable() {
        this.defineTableData();
        this.table = new google.visualization.Table(this.tableDiv);
        this.table.draw(this.tableData, {
            width: '100%', 
            height: '100%',
            alternatingRowStyle: true,
            cssClassNames: {
                headerCell: 'googleTableHeader',
                tableCell: 'googleTableRows'
            },
            sortColumn: 3,
            sortAscending: false 
        });  
    }


    defineGaugeData() {
        this.gaugeData = new google.visualization.DataTable();
        this.gaugeData.addColumn('string', 'Label');
        this.gaugeData.addColumn('number', 'Value');
        this.gaugeData.addRows([
            ['PolyCount', 0]
        ]);
    }


    drawGauge() {
        this.gauge = new google.visualization.Gauge(this.gaugeDiv);

        const totalPolyCount = this.extension.aggregatedData.reduce((total, item) => {
            console.log('---drawGauge item.modelPolycount:', item.modelPolycount);
            return total + item.modelPolycount;
        }, 0);

        const currentValue = this.gaugeData.getValue(0, 1);  // Get the current value

        const options = {
            width: '100%', 
            height: '100%', 
            redFrom: 0,  // Start red section from 0
            redTo: currentValue,  // End red section at current value
            greenFrom:currentValue, 
            greenTo: totalPolyCount,
            minorTicks: 0,
            max: totalPolyCount,
        };

        this.gauge.draw(this.gaugeData, options);
    }

    drawPanel() {
        this.drawTable();
        //Define gauge data and draw the gauge initially
        this.defineGaugeData();
        this.drawGauge();  
        // Add 'select' event listener
        google.visualization.events.addListener(this.table, 'select', () => {

            // Get the selected row
            const selection = this.table.getSelection();
            if (selection.length === 0) return;  // No row is selected

            // Get the Polycount value of the selected row
            const row = selection[0].row;
            const polycount = this.tableData.getValue(row, 3);  // Assuming Polycount is the third column

            // Update the gauge data
            this.gaugeData.setValue(0, 1, polycount);

            const selectedObjectName = this.tableData.getValue(row, 1);
            const selectedModelName = this.tableData.getValue(row, 0);

            // Find the object in this.extension.aggregatedData where modelName equals model
            const selectedModelData = this.extension.aggregatedData.find(item => item.modelName === selectedModelName);

            const dbIds = selectedModelData.modelData[selectedObjectName].dbids;

            // Initialize model to null
            let model = null;

            // Iterate over the keys of targetNodesMap
            for (let [key, value] of this.extension.targetNodesMap.entries()) {
                // Get the name of the model
                let name = this.extension.getFileInfo(key, "name");

                // If the name matches the model name, set the model to key
                if (name === selectedModelName) {
                    model = key;
                    break;
                }
            }

            // If model is not null, create the selection definition and select the elements
            if (model) {
                // Create the selection definition
                let selectionDef = {
                    model: model,
                    ids: [dbIds],
                    // selectionType: 3  // Replace 1 with the actual selection type
                };

                // Select the corresponding model elements in the viewer
                this.extension.viewer.setAggregateSelection([selectionDef], true);

                // Isolate and fit the view to the selected elements
                // Note: isolate and fitToView methods do not support aggregate selection directly
                // You may need to iterate over the models and call these methods for each model
                this.extension.viewer.isolate(dbIds, model);
                this.extension.viewer.fitToView(dbIds, model);
            }

            this.drawGauge();  // Redraw the gauge
        });          

    } 
}