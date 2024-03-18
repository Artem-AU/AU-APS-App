export class QtyHistogramPanel extends Autodesk.Viewing.UI.DockingPanel {
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

        this.dashboard = document.createElement('div');
        let titleHeight = this.title.offsetHeight;
        this.dashboard.style.height = `calc(100% - ${titleHeight}px)`;
        this.dashboard.style.width = '100%';
        this.dashboard.style.backgroundColor = 'white';
        this.dashboard.style.display = 'flex';
        this.dashboard.style.flexDirection = 'column';

        // Create the "setup" element
        this.setup = document.createElement('div');
        this.setup.id = 'setup';
        this.setup.style.height = '30px';
        this.setup.style.padding = '5px';

        // Create the label for the "selectQty" select element
        let labelQty = document.createElement('label');
        labelQty.for = 'selectQty';
        labelQty.textContent = 'Quantity:'; // Replace with your actual label text
        labelQty.style.color = 'black';
        labelQty.style.fontWeight = 'bold';
        labelQty.style.marginRight = '5px';

        this.setup.appendChild(labelQty);

        // Create the "selectQty" select element
        this.selectQty = document.createElement('select');
        this.selectQty.id = 'selectQty';
        this.selectQty.style.width = '300px';

        this.setup.appendChild(this.selectQty);

        // Create the label for the "selectProp" select element
        let labelProp = document.createElement('label');
        labelProp.for = 'selectProp';
        labelProp.textContent = 'Group by:'; // Replace with your actual label text
        labelProp.style.color = 'black';
        labelProp.style.fontWeight = 'bold';
        labelProp.style.marginRight = '5px';
        labelProp.style.marginLeft = '50px';

        this.setup.appendChild(labelProp);

        // Create the "selectProp" select element
        this.selectProp = document.createElement('select');
        this.selectProp.id = 'selectProp';
        this.selectProp.style.width = '300px';
        this.selectProp.style.marginRight = '30px';

        this.setup.appendChild(this.selectProp);
        this.dashboard.appendChild(this.setup);

        // Initialize Select2 on the select elements
        $(this.selectProp).select2();
        $(this.selectQty).select2();

        // Create the "chart" element
        this.chart = document.createElement('div');
        this.chart.id = 'chart';
        this.chart.style.borderTop = 'solid 1px #e0e0e0';
        this.chart.style.flex = '1';

        this.dashboard.appendChild(this.chart);    
        this.container.appendChild(this.dashboard);
    }

    drawDropdown() {
        const propKeys = new Set();
        const qtyKeys = new Set();
        const qtyIndicators = ["Volume", "Area", "Perimeter", "Weight", "Length", "Width", "Qty", "QTO", "Qto", "Quantit"];

        this.extension.aggregatedData.forEach((value) => {
            Object.keys(value.map).forEach((key) => {
                if (qtyIndicators.some(indicator => key.includes(indicator))) {
                    qtyKeys.add(key);
                } else {
                    propKeys.add(key);
                }
            });
        });

        const propKeysArray = Array.from(propKeys).filter(key => !key.startsWith("_"));
        const qtyKeysArray = Array.from(qtyKeys).filter(key => !key.startsWith("_"));

        this.selectProp.innerHTML = propKeysArray.map(prop => `<option value="${prop}">${prop}</option>`).join('\n');
        this.selectProp.onchange = () => this.drawChart(this.selectProp.value, this.selectQty.value);

        // Assuming you have another select element for qtyKeys
        this.selectQty.innerHTML = qtyKeysArray.map(qty => `<option value="${qty}">${qty}</option>`).join('\n');
        this.selectQty.onchange = () => this.drawChart(this.selectProp.value, this.selectQty.value);
    }

    defineChartData(prop, qty) {
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
                let displayValue = propertySet.map[qty].find(p => p.dbId === item.dbId)?.displayValue ?? 0; // Use optional chaining and nullish coalescing

                // If displayValue is a string, remove non-numeric characters and convert it to a number
                if (typeof displayValue === 'string') {
                    displayValue = parseFloat(displayValue.replace(/[^\d.-]/g, ''));

                }

                if (!dataRowsMap.has(item.displayValue)) {
                    const valuesForModels = new Array(models.length).fill([]); // Initialize an array of empty arrays for each model
                    valuesForModels[models.indexOf(model)] = [displayValue]; // Replace dbId with displayValue
                    dataRowsMap.set(item.displayValue, valuesForModels);
                } else {
                    dataRowsMap.get(item.displayValue)[models.indexOf(model)].push(displayValue); // Replace dbId with displayValue
                }
            }
        }        

        // Convert the Map to an array of arrays
        const dataRows = Array.from(dataRowsMap, ([displayValue, valuesForModels]) => [displayValue, ...valuesForModels]);
        // Combine the header and data rows
        const data = [header, ...dataRows];

        return data;        
    }

    drawChart(prop, qty) {
        const chartData = this.defineChartData(prop, qty);

        const dataTable = new google.visualization.DataTable();

        const firstItem = chartData[0];
        firstItem.forEach((item, index) => {
            const type = index === 0 ? 'string' : 'number';

            dataTable.addColumn(type, item);
        });

        chartData.slice(1).forEach((row) => {
            dataTable.addRow(row.map((item, index) => index === 0 ? item : Array.isArray(item) ? Math.round(item.reduce((a, b) => a + b, 0)) : item));
        });

        const options = {
            // title: prop,
            width: this.chart.offsetWidth - 20,
            height: this.chart.offsetHeight - 20,
            legend: { position: 'top', maxLines: 3 },
            fontName: 'Titillium Web',
            animation: {
                duration: 1000, // Duration in milliseconds
                easing: 'inAndOut', // Easing function
                startup: true, // Animate on initial draw
            },
            chartArea:{left:200,top:50,width: '90%',height:'80%'},
            // hAxis: {
            //     scaleType: 'log' // Set the horizontal axis to a logarithmic scale
            // },
            isStacked: true
        };

        const chart = new google.visualization.BarChart(this.chart);
        chart.draw(dataTable, options);
    }
}