export class TestPanel extends Autodesk.Viewing.UI.DockingPanel {
    constructor(extension, id, title, options) {
        super(extension.viewer.container, id, title, options);
        this.extension = extension;
        this.container.style.right = (options.x || 0) + 'px';
        this.container.style.top = (options.y || 0) + 'px';
        this.container.style.width = (options.width || 900) + 'px';
        this.container.style.height = (options.height || 600) + 'px' 
        this.valueFilterDrawn = false; // Add this line        
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

        this.valueFilterDiv = document.createElement('div');
        this.valueFilterDiv.id = 'valueFilter_div';
        this.valueFilterDiv.textContent = 'Filter Div';
        this.valueFilterDiv.style.backgroundColor = 'gray';
        this.valueFilterDiv.style.flex = '0 0 20%';  // Fixed width of 20%
        this.valueFilterColumnDiv = document.createElement('div');
        this.valueFilterDiv.appendChild(this.valueFilterColumnDiv);
        this.valueFilterValueDiv = document.createElement('div');
        this.valueFilterDiv.appendChild(this.valueFilterValueDiv);
        this.dashboardDiv.appendChild(this.valueFilterDiv);
        

        this.tableDiv = document.createElement('div');
        this.tableDiv.id = 'table_div';
        this.tableDiv.textContent = 'Table Div';
        this.tableDiv.style.backgroundColor = 'red';
        this.tableDiv.style.flex = '1 0 60%';  // Take up the remaining space
        this.tableDiv.style.overflow = 'auto';  // Add scrollbar when content overflows
        this.dashboardDiv.appendChild(this.tableDiv);

        this.columnFilterDiv = document.createElement('div');
        this.columnFilterDiv.id = 'columnFilter_div';
        this.columnFilterDiv.textContent = 'Filter Div';
        this.columnFilterDiv.style.backgroundColor = 'lightsteelblue';
        this.columnFilterDiv.style.flex = '0 0 20%';  // Fixed width of 20%
        this.dashboardDiv.appendChild(this.columnFilterDiv);

    }


    createTable() {
        // Get the googleDataTable from the extension
        this.data = this.extension.getDataTable();
        console.log(" createTable Data", this.data);

        // Create an array of column definitions
        this.columns = [];

        // Add a column for each header in the data
        this.data[0].forEach(header => {
            if (!header.startsWith('_') && header !== 'Name' && header !== 'dbId') {
                this.columns.push({title: header, field: header});
            }
        });

        // console.log(" createTable Columns", this.columns);

        // Create the Tabulator instance
        this.table = new Tabulator(this.tableDiv, {
            layout: 'fitColumns',
            columns: this.columns,
            // groupBy: DATAGRID_CONFIG.groupBy,
            // rowClick: (e, row) => DATAGRID_CONFIG.onRowClick(row.getData(), this.extension.viewer)
        });

        // Add rows to the table
        this.table.setData(this.data.slice(1));  // Exclude the first item (headers)
    }

    drawColumnFilter() {
        // Create a select element
        const select = document.createElement('select');
        select.multiple = true; // Allow multiple selections

        // Populate the select element with options
        this.columns.forEach((column, i) => {
            const columnLabel = column.title;
            // // Skip the "Name" and "dbId" columns
            // if (columnLabel === 'Name' || columnLabel === 'dbId') {
            //     return;
            // }
            const option = document.createElement('option');
            option.value = i;
            option.text = columnLabel;
            select.appendChild(option);
        });

        // Append the select element to the columnFilterDiv
        this.columnFilterDiv.appendChild(select);

        // Initialize Select2 on the select element
        $(select).select2({
            width: '80%' // Set the width to 80%
        });

        // Add an event listener to handle changes
        $(select).on("change", () => {
            // console.log('Select changed');
            let selectedColumns = $(select).select2('data');
            // console.log('Selected items:', selectedColumns);

            // If the user cleared the selection, set selectedColumns to all properties
            if (selectedColumns.length === 0) {
                selectedColumns = this.columns.map(column => column.title);
                // console.log('No columns selected', selectedColumns);
            } else {
                // Store the selected column texts in an instance variable
                selectedColumns = selectedColumns.map(item => item.text);
            }
            // console.log('Selected columns:', selectedColumns);

            // Filter this.columns to include only the selected columns
            const filteredColumns = this.columns.filter(column => selectedColumns.includes(column.title));

            // Update the columns in the table
            this.table.setColumns(filteredColumns);

            // Update the DataView and redraw the table
            // this.updatePanel();
            // console.log('Panel updated FROM FILTER');
        });
    }

    drawValueFilter(columnKey) {
        // Create a select element
        const select = document.createElement('select');
        select.multiple = true; // Allow multiple selections

        console.log(" drawValueFilter Data", this.data);

        // Populate the select element with options
        this.data.slice(1).forEach((item) => { // Start from the second item
            if (item[columnKey]) {
                const option = document.createElement('option');
                option.value = item[columnKey];
                option.text = item[columnKey];
                select.appendChild(option);
            }
        });

        // Append the select element to the valueFilterDiv
        this.valueFilterValueDiv.appendChild(select);

        // Initialize Select2 on the select element
        $(select).select2({
            width: '80%' // Set the width to 80%
        });

        // Add an event listener to handle changes
        $(select).on("change", () => {
            console.log('Select changed');
            const selectedValues = $(select).select2('data');
            console.log('Selected items:', selectedValues.map(item => item.text));

            // Store the selected values in an instance variable
            this.selectedValues = selectedValues.map(item => item.text);
            console.log('Selected values:', this.selectedValues);

            // Set a filter on the table to only show rows with selected values in the columnKey column
            this.table.setFilter(columnKey, "in", this.selectedValues);
        });
    }

    drawColumnKeyFilter() {
        // Create a select element
        const select = document.createElement('select');

        // Populate the select element with options
        this.columns.forEach((column, i) => {
            const columnLabel = column.title;
            const option = document.createElement('option');
            option.value = i;
            option.text = columnLabel;
            select.appendChild(option);
        });

        // Append the select element to the valueFilterDiv
        this.valueFilterColumnDiv.appendChild(select);

        // Initialize Select2 on the select element
        $(select).select2({
            width: '80%' // Set the width to 80%
        });

        // Add an event listener to handle changes
        $(select).on("change", () => {
            // Get the selected column
            const selectedColumn = $(select).select2('data')[0].text;
            console.log('Selected column:', selectedColumn);
    
            // Clear the valueFilterDiv
            this.valueFilterValueDiv.innerHTML = '';
    
            // Draw the value filter for the selected column
            this.drawValueFilter(selectedColumn);
        });
    }


    updatePanel () {
       
    }

}