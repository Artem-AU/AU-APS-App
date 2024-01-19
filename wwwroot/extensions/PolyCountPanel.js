
export class PolyCountPanel extends Autodesk.Viewing.UI.DockingPanel {
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

    defineGaugeData() {
        this.gaugeData = new google.visualization.DataTable();
        this.gaugeData.addColumn('string', 'Label');
        this.gaugeData.addColumn('number', 'Value');
        this.gaugeData.addRows([
            ['PolyCount', 0]
        ]);
    }

    drawTable() {
        // Use googleDataTable from the extension directly
        this.table = new google.visualization.Table(this.tableDiv);
        this.table.draw(this.extension.googleDataTable, {
            width: '100%', 
            height: '100%',
            alternatingRowStyle: true,
            cssClassNames: {
                headerCell: 'googleTableHeader',
                tableCell: 'googleTableRows'
            },
            sortColumn: 2,
            sortAscending: false 
        });  
    }

    drawGauge() {
        this.gauge = new google.visualization.Gauge(this.gaugeDiv);

        const totalPolyCount = this.extension.totalPolyCount;
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

    updatePanel() {
        // Wait for dataTablePromise to resolve before calling drawTable
        this.extension.dataTablePromise.then(() => {
            this.drawTable();
            // Define the gauge data and draw the gauge initially
            this.defineGaugeData();
            this.drawGauge();
            // Add 'select' event listener
            google.visualization.events.addListener(this.table, 'select', () => {

                // Get the selected row
                const selection = this.table.getSelection();
                if (selection.length === 0) return;  // No row is selected

                // Get the Polycount value of the selected row
                const row = selection[0].row;
                const polycount = this.extension.googleDataTable.getValue(row, 2);  // Assuming Polycount is the third column

                // Update the gauge data
                this.gaugeData.setValue(0, 1, polycount);

                // Get the name of the selected item
                const name = this.extension.googleDataTable.getValue(row, 0);

                // Get the dbIds of the selected item
                const dbIds = this.extension.tableData[name].dbids;

                // Select the corresponding model elements
                this.extension.viewer.select(dbIds);
                this.extension.viewer.isolate(dbIds);
                this.extension.viewer.fitToView(dbIds);

                this.drawGauge();  // Redraw the gauge
            });
        });
    } 
}