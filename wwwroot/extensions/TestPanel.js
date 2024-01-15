
export class TestPanel extends Autodesk.Viewing.UI.DockingPanel {
    constructor(extension, id, title, options) {
        super(extension.viewer.container, id, title, options);
        this.extension = extension;
        this.container.style.right = (options.x || 0) + 'px';
        this.container.style.bottom = (options.y || 0) + 'px';
        this.container.style.width = (options.width || 600) + 'px';
        this.container.style.height = (options.height || 600) + 'px';
        this.container.style.resize = 'both'; // Allow both horizontal and vertical resizing
        this.container.style.overflow = 'hidden'; // Add scrollbars if content overflows

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

        this.chartDiv = document.createElement('div');
        this.chartDiv.id = 'chart_div';
        this.chartDiv.textContent = 'Chart Div';
        this.chartDiv.style.backgroundColor = 'red';
        this.chartDiv.style.height = '250px';  
        this.content.appendChild(this.chartDiv);

        this.gaugeDiv = document.createElement('div');
        this.gaugeDiv.id = 'gauge_div';
        this.gaugeDiv.textContent = 'Gauge Div';
        this.gaugeDiv.style.backgroundColor = 'blue';
        this.gaugeDiv.style.height = '250px';
        this.content.appendChild(this.gaugeDiv);

    }

    // defineTableData() {
    //     // Get tableData from the extension
    //     const tableData = this.extension.tableData;

    //     console.log('---TEST tableData', tableData);


    //     // Create a new DataTable
    //     this.googleDataTable = new google.visualization.DataTable();

    //     // Define the columns
    //     this.googleDataTable.addColumn('string', 'Name');
    //     this.googleDataTable.addColumn('number', 'Instances');
    //     this.googleDataTable.addColumn('number', 'Polycount');

    //     // Add a row for each unique name
    //     for (const name in tableData) {
    //         console.log('---TEST name', name);
    //         const { instances, polycount } = tableData[name];
    //         this.googleDataTable.addRow([name, instances, polycount]);
    //     }
    // }

    defineGaugeData() {
        // define some arbitrary data for the gauge using google charts
        this.gaugeData = new google.visualization.DataTable();
        this.gaugeData.addColumn('string', 'Label');
        this.gaugeData.addColumn('number', 'Value');
        this.gaugeData.addRows([
            ['Memory', 80]
        ]);
    }

    drawTable() {
        // Use googleDataTable from the extension directly
        this.table = new google.visualization.Table(this.chartDiv);
        this.table.draw(this.extension.googleDataTable, {
            showRowNumber: true, 
            width: '100%', 
            height: '100%',
            cssClassNames: {
                headerCell: 'blackText',
                tableCell: 'blackText'
            }
        });    }

    drawGauge() {
        // draw the gauge using google charts, call the defineGaugeData function first
        this.defineGaugeData();
        this.gauge = new google.visualization.Gauge(this.gaugeDiv);
        this.gauge.draw(this.gaugeData, {width: '100%', height: '100%', redFrom: 90, redTo: 100, yellowFrom: 75, yellowTo: 90, minorTicks: 5});

    }

    updatePanel() {
        // Wait for dataTablePromise to resolve before calling drawTable
        this.extension.dataTablePromise.then(() => {
            this.drawTable();
        });
        this.drawGauge();
    }   
}