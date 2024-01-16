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
            <div class="chart" style="position: relative; height: calc(100% - 26px);"></div>
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

        // Define an array of colors for the bars
        const colors = ['red', 'orange', 'yellow', 'green', 'blue', 'indigo', 'violet'];

        // Create an array of data rows, each with a color and an annotation from the colors array
        const dataRows = propertyValues.map((val, i) => [String(val), histogram.get(val).length, `color: ${colors[i % colors.length]}; opacity: 0.6`, String(histogram.get(val).length)]);

        // Create the data table
        const data = new google.visualization.arrayToDataTable([
            [propName, 'Count', { role: 'style' }, { role: 'annotation' }],
            ...dataRows
        ]);


        const options = {
            title: propName,
            width: this.chartDiv.offsetWidth - 20,
            height: this.chartDiv.offsetHeight - 20,
            legend: { position: 'none' },
            fontName: 'ArtifaktElement',
            animation: {
                duration: 1000, // Duration in milliseconds
                easing: 'inAndOut', // Easing function
                startup: true, // Animate on initial draw
            },
            chartArea:{left:200,top:50,width: '90%',height:'80%'},
            hAxis: {
                scaleType: 'log' // Set the horizontal axis to a logarithmic scale
            }
        };

        const chart = new google.visualization[this.chartType](this.chartDiv);
        chart.draw(data, options);

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
                this.extension.viewer.select(dbids);
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