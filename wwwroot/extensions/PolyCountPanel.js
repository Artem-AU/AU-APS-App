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
        this.chartType = options.chartType || 'ColumnChart'; // Default to ColumnChart for Google Charts

        // Load the Google Charts library and set a callback to be executed once it's loaded
        google.charts.load('current', {'packages':['table', 'controls']});
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
        this.container.appendChild(this.content);

        // Create the filter_div and chart_div elements
        this.filterDiv = document.createElement('div');
        this.filterDiv.id = 'filter_div';
        this.content.appendChild(this.filterDiv);

        this.chartDiv = document.createElement('div');
        this.chartDiv.id = 'chart_div';
        this.content.appendChild(this.chartDiv);
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
                if (!nameData[props.name]) {
                    nameData[props.name] = { instances: 0, polycount: 0 };
                }

                // Increment the instance count for the name
                nameData[props.name].instances++;

                // Update the polycount for the name
                nameData[props.name].polycount = totalTriCount;

                resolve();
            });
        }));

        await Promise.all(promises);

        // Create an empty data table
        var data = new google.visualization.DataTable();
        data.addColumn('string', 'Name');
        data.addColumn('number', 'Instances');
        data.addColumn('number', 'Instance Polycount');
        data.addColumn('number', 'Name Polycount');

        let totalNamePolycount = 0;


        // Add a row to the data table for each unique name
        for (const name in nameData) {
            const instances = nameData[name].instances;
            const instancePolycount = nameData[name].polycount;
            const namePolycount = instances * instancePolycount;

            totalNamePolycount += namePolycount;

            data.addRow([name, instances, instancePolycount, namePolycount]);
        }

        console.log('Total Name Polycount:', totalNamePolycount);


        // Sort the data table by the 'Name Polycount' column (column index 3)
        data.sort([{column: 3, desc: true}]);

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
                'width': 300,
                'height': 300,
                'alternatingRowStyle': true,
                'legend': 'right',
                'cssClassNames': {
                    'headerCell': 'blackText',
                    'tableCell': 'blackText'
                }
            }
        }); 

        // Establish dependencies, declaring that 'filter' drives 'tableChart',
        // so that the table chart will only display entries that are let through
        // given the chosen slider range.
        dashboard.bind(donutRangeSlider, tableChart);

        // Draw the dashboard.
        dashboard.draw(data);
    }


    async setVisible(show) {
        super.setVisible(show);
        if (show) {
            const targetNodes = await this.extension.findTargetNodes(this.extension.viewer.model);

            // Helper function to get all child nodes of a given node
            const getAllChildNodes = (model, dbId) => new Promise((resolve, reject) => {
                const instanceTree = model.getData().instanceTree;
                const childNodes = [];

                instanceTree.enumNodeChildren(dbId, (childId) => {
                    childNodes.push(childId);
                }, false);

                resolve(childNodes);
            });

            // Create an object to store the target nodes and their child nodes
            const targetNodesWithChildren = {};

            // Get all child nodes of each target node and add them to the object
            for (const dbId of targetNodes) {
                const childNodes = await getAllChildNodes(this.extension.viewer.model, dbId);
                targetNodesWithChildren[dbId] = childNodes;
            }

            console.log(targetNodesWithChildren);

            // Call drawDashboard with targetNodes
            this.drawDashboard(targetNodes);
        }
    }
}