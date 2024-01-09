export class HistogramPanel extends Autodesk.Viewing.UI.DockingPanel {
    constructor(extension, id, title, options) {
        super(extension.viewer.container, id, title, options);
        this.extension = extension;
        this.container.style.right = (options.x || 0) + 'px';
        this.container.style.top = (options.y || 0) + 'px';
        this.container.style.width = (options.width || 400) + 'px';
        this.container.style.minWidth = '400px';
        this.container.style.height = (options.height || 450) + 'px';
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
        this.content.style.height = '100%';
        this.content.style.width = '100%';
        this.content.style.backgroundColor = 'white';
        this.content.innerHTML = `
            <div class="props-container" style="position: relative; height: 25px; padding: 0.5em;">
                <select class="props"></select>
                <button class="export-button">Export Chart</button>
            </div>
            <div class="chart-container" style="position: relative; height: 325px; padding: 0.5em;">
                <div class="chart"></div>
            </div>
        `;
        this.select = this.content.querySelector('select.props');
        this.chartDiv = this.content.querySelector('div.chart');
        this.exportButton = this.content.querySelector('button.export-button');
        this.exportButton.onclick = () => this.exportChart();
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
        const options = {
            title: propName,
            width: this.chartDiv.offsetWidth,
            height: this.chartDiv.offsetHeight,
            legend: { position: 'none' },
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
                // Get the row and column of the selected element
                const row = selection[0].row;
                const column = selection[0].column;

                // Get the value of the selected element
                const selectedValue = data.getValue(row, column);

                // Now you can use selectedValue to select the associated model elements
                // ...
            }
        });
    }

    exportChart() {
        // Google Charts doesn't provide a built-in method to export the chart as an image.
        // You may need to use a third-party library or a server-side solution to export the chart.
    }
}