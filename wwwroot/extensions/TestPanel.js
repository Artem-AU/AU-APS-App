
export class TestPanel extends Autodesk.Viewing.UI.DockingPanel {
    constructor(extension, id, title, options) {
        super(extension.viewer.container, id, title, options);
        this.extension = extension;
        this.container.style.right = (options.x || 0) + 'px';
        this.container.style.top = (options.y || 0) + 'px';
        this.container.style.width = (options.width || 900) + 'px';
        this.container.style.height = (options.height || 300) + 'px';
        // this.container.style.resize = 'both'; // Allow both horizontal and vertical resizing
        this.container.style.overflow = 'hidden'; // Add scrollbars if content overflows

        // this.table = null;  // Add this line

        // Load the Google Charts library and set a callback to be executed once it's loaded
        google.charts.load('current', {'packages':['table', "gauge"]});
        google.charts.setOnLoadCallback(() => this.isGoogleChartsLoaded = true);
        
    }

    initialize() {
        this.title = this.createTitleBar(this.titleLabel || this.container.id);
        this.initializeMoveHandlers(this.title);
        this.container.appendChild(this.title);
        this.content = document.createElement('div');
        this.container.appendChild(this.content);
        let titleHeight = this.title.offsetHeight;
        this.content.style.height = `calc(100% - ${titleHeight}px)`;
        // this.content.style.backgroundColor = 'white';

        // Set the display property of the content to flex
        this.content.style.display = 'flex';
        this.content.style.flexDirection = 'row';

        this.tableDiv = document.createElement('div');
        this.tableDiv.id = 'chart_div';
        this.tableDiv.textContent = 'Chart Div';
        this.tableDiv.style.backgroundColor = 'red';
        this.tableDiv.style.height = '250px';  
        this.tableDiv.style.flex = '2';  // Add this line
        this.content.appendChild(this.tableDiv);

        this.gaugeDiv = document.createElement('div');
        this.gaugeDiv.id = 'gauge_div';
        this.gaugeDiv.textContent = 'Gauge Div';
        this.gaugeDiv.style.backgroundColor = '#808080';
        this.gaugeDiv.style.height = '250px';
        this.gaugeDiv.style.flex = '1';  // Keep this line as is
        // Add these lines
        this.gaugeDiv.style.display = 'flex';
        this.gaugeDiv.style.justifyContent = 'center';
        this.gaugeDiv.style.alignItems = 'center';
        this.content.appendChild(this.gaugeDiv);
    }

    defineGaugeData() {
        // define some arbitrary data for the gauge using google charts
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
            showRowNumber: true, 
            width: '100%', 
            height: '100%',
            cssClassNames: {
                headerCell: 'blackText',
                tableCell: 'blackText'
            }
        });  
    }

    drawGauge() {
        this.gauge = new google.visualization.Gauge(this.gaugeDiv);

        const totalPolyCount = this.extension.totalPolyCount;
        const currentValue = this.gaugeData.getValue(0, 1);  // Get the current value

        // // Format the gauge data
        // var formatter = new google.visualization.NumberFormat({pattern: '# ### K'});
        // formatter.format(this.gaugeData, 1);  // Apply formatter to second column

        const options = {
            width: '100%', 
            height: '100%', 
            redFrom: 0,  // Start red section from 0
            redTo: currentValue,  // End red section at current value
            yellowFrom:currentValue, 
            yellowTo: totalPolyCount,
            minorTicks: 5,
            max: totalPolyCount,
        };

        this.gauge.draw(this.gaugeData, options);
        console.log('---TEST Gauge drawn'); 
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
                console.log("select fired");

                // Get the selected row
                const selection = this.table.getSelection();
                if (selection.length === 0) return;  // No row is selected

                // Get the Polycount value of the selected row
                const row = selection[0].row;
                const polycount = this.extension.googleDataTable.getValue(row, 2);  // Assuming Polycount is the third column
                console.log('---TEST polycount', polycount);
                console.log('---TEST this.gaugeData', this.gaugeData);

                // Update the gauge data
                this.gaugeData.setValue(0, 1, polycount);
                console.log('---TEST SET this.gaugeData', this.gaugeData);

                // this.updateGauge();  // Update the gauge data based on the selected row
                this.drawGauge();  // Redraw the gauge
            });
        });

        // this.drawGauge();
    } 
}