export class PolyCountPanel extends Autodesk.Viewing.UI.DockingPanel {
    constructor(extension, id, title, options) {
        super(extension.viewer.container, id, title, options);
        this.extension = extension;
        this.container.style.right = (options.x || 0) + 'px';
        this.container.style.top = (options.y || 0) + 'px';
        this.container.style.width = (options.width || 900) + 'px';
        this.container.style.minWidth = '400px';
        this.container.style.height = (options.height || 600) + 'px';
        this.container.style.minHeight = '450px';
        this.container.style.resize = 'auto';

        // Load the Google Charts library and set a callback to be executed once it's loaded
        google.charts.load('current', {'packages':['table', "gauge", 'controls']});
        google.charts.setOnLoadCallback(() => this.isGoogleChartsLoaded = true);
    }

    initialize() {
        this.title = this.createTitleBar(this.titleLabel || this.container.id);
        this.closer = this.createCloseButton(); 
        this.initializeCloseHandler(this.closer);
        this.initializeMoveHandlers(this.title);
        this.container.appendChild(this.title);
        this.container.appendChild(this.closer);
        this.content = document.createElement('div');
        let titleHeight = this.title.offsetHeight;
        this.content.style.height = `calc(100% - ${titleHeight}px)`;
        this.content.style.overflow = 'auto';
        this.content.id = 'dashboard_div';
        this.content.style.backgroundColor = 'white';   
        this.container.appendChild(this.content);

        // Create the filter_div and chart_div elements
        this.filterDiv = document.createElement('div');
        this.filterDiv.id = 'filter_div';
        // Set the opacity of the filterDiv to 0 to make it fully transparent
        this.filterDiv.style.opacity = "0";
        // If you want to prevent interaction with the filterDiv, set pointer-events to none
        this.filterDiv.style.pointerEvents = "none";
        this.content.appendChild(this.filterDiv);

        this.chartDiv = document.createElement('div');
        this.chartDiv.id = 'chart_div';
        this.content.appendChild(this.chartDiv);

        this.gaugeDiv = document.createElement('div');
        this.gaugeDiv.id = 'gauge_div';
        this.content.appendChild(this.gaugeDiv);
    }

    async drawDashboard(targetNodes) {
        // Check if the Google Charts library is loaded before proceeding
        if (!this.isGoogleChartsLoaded) {
            console.error('Google Charts library is not loaded yet');
            return;
        }

        // Create an object to store the instances and polycounts of each name
        const nameData = {};

        // Iterate over each dbId
        const promises = targetNodes.map(dbId => new Promise(resolve => {
            let totalTriCount = 0;

            // Get the fragment IDs for each dbId
            this.extension.viewer.model.getData().instanceTree.enumNodeFragments(dbId, (fragId) => {
                // Get the triangle count for each fragment
                const renderProxy = this.extension.viewer.impl.getRenderProxy(this.extension.viewer.model, fragId);

                if (renderProxy && renderProxy.geometry) {
                    const polyCount = renderProxy.geometry.polyCount;
                    totalTriCount += polyCount;
                }
            }, true);

            // Get the properties of the node
            this.extension.viewer.model.getProperties(dbId, (props) => {
                // Initialize the data for the name if it doesn't exist
                let cleanName = props.name.split(/[\[:]/)[0].trim();

                if (!nameData[cleanName]) {
                    nameData[cleanName] = { instances: 0, polycount: 0, namePolycount: 0, dbids: [] };
                }

                // Increment the instance count for the name
                nameData[cleanName].instances++;

                // Update the polycount for the name
                nameData[cleanName].polycount = totalTriCount;

                // Calculate the Name Polycount
                nameData[cleanName].namePolycount = nameData[cleanName].instances * totalTriCount;

                nameData[cleanName].dbids.push(dbId);

                resolve();
            });
        }));

        await Promise.all(promises);

        console.log(nameData);

        // Convert the nameData object to an array of arrays
        const nameDataArray = Object.entries(nameData).map(([name, {instances, polycount, namePolycount}]) => [name, instances, polycount, namePolycount]);

        // Sort the array by the 'Name Polycount' (index 3), in descending order
        nameDataArray.sort((a, b) => b[3] - a[3]);

        // Create an empty data table
        var data = new google.visualization.DataTable();
        data.addColumn('string', 'Name');
        data.addColumn('number', 'Instances');
        data.addColumn('number', 'Instance Polycount');
        data.addColumn('number', 'Name Polycount');

        // Add a row to the data table for each unique name
        for (const [name, instances, instancePolycount, namePolycount] of nameDataArray) {
            data.addRow([name, instances, instancePolycount, namePolycount]);
        }

        // Create an empty data table for the gauge chart
        var gaugeData = new google.visualization.DataTable();
        gaugeData.addColumn('string', 'Label');
        gaugeData.addColumn('number', 'Value');

        // Add a row to the gauge data table for each unique name
        for (const [name, instances, instancePolycount, namePolycount] of nameDataArray) {
            gaugeData.addRow([name, instances]);  // Use instances as the value for the gauge
        }



        // // Sort the data table by the 'Name Polycount' column (column index 3)
        // data.sort([{column: 3, desc: true}]);

        // Create a dashboard.
        var dashboard = new google.visualization.Dashboard(
            document.getElementById('dashboard_div'));

        // Create a range slider, passing some options
        var donutRangeSlider = new google.visualization.ControlWrapper({
            'controlType': 'NumberRangeFilter',
            'containerId': 'filter_div',
            'options': {
                'filterColumnLabel': 'Instances'
            }
        });

        // Create a table chart, passing some options
        var tableChart = new google.visualization.ChartWrapper({
            'chartType': 'Table',
            'containerId': 'chart_div',
            'options': {
                'width': "100%",
                'height': 300,
                'alternatingRowStyle': true,
                'legend': 'right',
                'cssClassNames': {
                    'headerCell': 'blackText',
                    'tableCell': 'blackText'
                }
            }
        }); 

        // Create a gauge chart using a ChartWrapper, passing some options
        var gaugeChart = new google.visualization.ChartWrapper({
            'chartType': 'Gauge',
            'containerId': 'gauge_div',  // Assuming you have a div with id 'gauge_div'
            'dataTable': gaugeData,
            'options': {
                width: 400, height: 120,
                redFrom: 90, redTo: 100,
                yellowFrom:75, yellowTo: 90,
                minorTicks: 5,
                max: this.model.instancePolyCount()  // Set the maximum value to model.instancePolyCount()
            }
        });

        // Draw the gauge chart
        gaugeChart.draw();

        // Establish dependencies, declaring that 'filter' drives 'tableChart',
        // so that the table chart will only display entries that are let through
        // given the chosen slider range.
        dashboard.bind(donutRangeSlider, tableChart);

        // Draw the dashboard.
        dashboard.draw(data);

        // Add an event listener for the chart's ready event
        google.visualization.events.addListener(tableChart, 'ready', () => {
            // Add an event listener for the chart's select event
            google.visualization.events.addListener(tableChart.getChart(), 'select', () => {
                // Get information about the selected element
                const selection = tableChart.getChart().getSelection();

                // If an element is selected
                if (selection.length > 0) {
                    // Get the row of the selected element
                    const row = selection[0].row;

                    // Get the value of the selected element
                    const selectedValue = data.getValue(row, 0); // 0 is the column index for property values
                    console.log('Selected value:', selectedValue);

                    // Get the DBIDs associated with the selected value
                    const dbids = nameData[selectedValue].dbids;

                    // Isolate and fit the viewer to these DBIDs
                    this.extension.viewer.isolate(dbids);
                    this.extension.viewer.fitToView(dbids);
                }
            });
        });
    }


    async setVisible(show) {
        super.setVisible(show);
        if (show) {
            const targetNodes = await this.extension.findTargetNodes(this.extension.viewer.model);

            // Call drawDashboard with targetNodes
            this.drawDashboard(targetNodes);
        }
    }
}