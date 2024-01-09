export class HistogramPanel extends Autodesk.Viewing.UI.DockingPanel {
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
        google.charts.load('current', { packages: ['corechart'] });
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
        this.content.style.width = '100%';
        this.content.style.backgroundColor = 'white';
        this.content.innerHTML = `
            <div class="props-container" style="height: 20px; padding: 3px 10px;">
                <select class="props" style="height: 100%;"></select>
            </div>
            <div class="chart" style="position: relative; height: calc(100% - 26px); overflow-y: scroll"></div>
        `;
        this.select = this.content.querySelector('select.props');
        this.chartDiv = this.content.querySelector('div.chart');
        this.container.appendChild(this.content);
    }

    async setModel(model) {
        const propertyNames = await this.extension.findPropertyNames(model);
        this.select.innerHTML = propertyNames.map(prop => `<option value="${prop}">${prop}</option>`).join('\n');
        this.select.onchange = () => this.updateChart(model, this.select.value);
        this.updateChart(model, this.select.value);
    }

    async updateChart(model, propName) {
        // Check if the Google Charts library is loaded before proceeding
        if (!this.isGoogleChartsLoaded) {
            console.error('Google Charts library is not loaded yet');
            return;
        }
        const histogram = await this.extension.findPropertyValueOccurrences(model, propName);
        const propertyValues = Array.from(histogram.keys());
        const data = new google.visualization.DataTable();
        data.addColumn('string', propName);
        data.addColumn('number', 'Count');
        data.addRows(propertyValues.map(val => [String(val), histogram.get(val).length]));
        console.log(data);
        const options = {
            title: propName,
            width: this.chartDiv.offsetWidth * 0.9,
            height: this.chartDiv.offsetHeight * 0.9,
            legend: { position: 'top' },
            animation: {
                duration: 1000, // Duration in milliseconds
                easing: 'inAndOut', // Easing function
                startup: true, // Animate on initial draw
            },
            chartArea:{left:150,top:0,width:'100%',height:'100%'}
        };
        console.log(this.chartType); // Log the value of this.chartType

        const chart = new google.visualization[this.chartType](this.chartDiv);
        chart.draw(data, options);

        // Add an event listener for the window's resize event
            window.addEventListener('resize', () => {
                // Update the chart's width and height to match the container's offsetWidth and offsetHeight
options.width = this.chartDiv.offsetWidth;
        options.height = this.chartDiv.offsetHeight;

        // Redraw the chart with the updated options
            chart.draw(data, options);
        });

        // Add an event listener for the chart's select event
        google.visualization.events.addListener(chart, 'select', () => {
            // Get information about the selected element
            const selection = chart.getSelection();

            // If an element is selected
            if (selection.length > 0) {
                // Get the row of the selected element
                const row = selection[0].row;

                // Get the value of the selected element
                const selectedValue = data.getValue(row, 0); // 0 is the column index for property values

                // Get the DBIDs associated with the selected value
                const dbids = histogram.get(selectedValue);

                // Isolate and fit the viewer to these DBIDs
                this.extension.viewer.isolate(dbids);
                this.extension.viewer.fitToView(dbids);
            }
        });
    }

    exportChart() {
        // Google Charts doesn't provide a built-in method to export the chart as an image.
        // You may need to use a third-party library or a server-side solution to export the chart.
    }
}