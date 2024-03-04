export class HistogramPanel extends Autodesk.Viewing.UI.DockingPanel {
    constructor(extension, id, title, options) {
        super(extension.viewer.container, id, title, options);
        this.extension = extension;
        this.container.style.right = (options.x || 0) + 'px';
        this.container.style.top = (options.y || 0) + 'px';
        this.container.style.width = (options.width || 900) + 'px';
        this.container.style.height = (options.height || 600) + 'px';
        // Load the Google Charts library and set a callback to be executed once it's loaded
        google.charts.load('current', {packages: ['corechart', 'bar']});
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
                <label for="props-select" style="color: black; font-weight: bold;">Select Property:</label>
                <select id="props-select" class="props" style="height: 100%; font-family: ArtifaktElement; color: black;"></select>
            </div>
            <div class="chart" style="position: relative; height: calc(100% - 26px);"></div>
        `;
        this.select = this.content.querySelector('#props-select');
        this.chartDiv = this.content.querySelector('div.chart');
        this.container.appendChild(this.content);
    }

    drawDropdown() {
        const uniqueKeys = new Set();

        this.extension.aggregatedData.forEach((value) => {
            Object.keys(value.map).forEach((key) => {
                uniqueKeys.add(key);
            });
        });

        const uniqueKeysArray = Array.from(uniqueKeys);
        const filteredKeysArray = uniqueKeysArray.filter(key => !key.startsWith("_"));
        this.select.innerHTML = filteredKeysArray.map(prop => `<option value="${prop}">${prop}</option>`).join('\n');
        this.select.onchange = () => this.drawChart(this.select.value);
        // return filteredKeysArray;
    }

    defineChartData(prop) {
        // Create the header row
        const header = ['Property'];
        const models = Array.from(this.extension.aggregatedData.keys());
        for (const model of models) {
            const modelName = this.extension.getFileInfo(model, 'name'); // Call getFileInfo to get the model name
            header.push(modelName);
        }

        // Create the data rows
        const dataRowsMap = new Map();
        for (const [model, propertySet] of this.extension.aggregatedData.entries()) {
            // Check if prop is in propertySet.map
            if (!(prop in propertySet.map)) {
                continue; // Skip to the next iteration of the outer loop
            }
            for (const item of propertySet.map[prop]) { // Iterate over the array of objects
                if (!dataRowsMap.has(item.displayValue)) {
                    const dbIdsForModels = new Array(models.length).fill([]); // Initialize an array of empty arrays for each model
                    dbIdsForModels[models.indexOf(model)] = [item.dbId]; // Add the dbId to the correct position in the array
                    dataRowsMap.set(item.displayValue, dbIdsForModels);
                } else {
                    dataRowsMap.get(item.displayValue)[models.indexOf(model)].push(item.dbId); // Push the dbId to the correct array
                }
            }
        }

        // Convert the Map to an array of arrays
        const dataRows = Array.from(dataRowsMap, ([displayValue, dbIdsForModels]) => [displayValue, ...dbIdsForModels]);

        // Combine the header and data rows
        const data = [header, ...dataRows];

        // Return the data
        return data;
    }

    drawChart(prop) {
        const chartData = this.defineChartData(prop);

        const dataTable = new google.visualization.DataTable();

        const firstItem = chartData[0];
        firstItem.forEach((item, index) => {
            const type = index === 0 ? 'string' : 'number';
            dataTable.addColumn(type, item);
        });

        chartData.slice(1).forEach((row) => {
            dataTable.addRow(row.map((item, index) => index === 0 ? item : item.length));
        });

        const options = {
            // title: prop,
            width: this.chartDiv.offsetWidth - 20,
            height: this.chartDiv.offsetHeight - 20,
            legend: { position: 'top', maxLines: 3 },
            fontName: 'Titillium Web',
            animation: {
                duration: 1000, // Duration in milliseconds
                easing: 'inAndOut', // Easing function
                startup: true, // Animate on initial draw
            },
            chartArea:{left:200,top:50,width: '90%',height:'80%'},
            hAxis: {
                scaleType: 'log' // Set the horizontal axis to a logarithmic scale
            },
            isStacked: true
        };

        const chart = new google.visualization.BarChart(this.chartDiv);
        chart.draw(dataTable, options);
    }
}