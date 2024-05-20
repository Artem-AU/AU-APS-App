export class BulkPropertiesPanel extends Autodesk.Viewing.UI.DockingPanel {
    constructor(extension, id, title, options) {
        super(extension.viewer.container, id, title, options);
        this.extension = extension;
        this.container.style.left = (options.x || 0) + 'px';
        this.container.style.top = (options.y || 0) + 'px';
        this.container.style.width = (options.width || 800) + 'px';
        this.container.style.height = (options.height || 600) + 'px' 
        this.combinedFilters = {
            columnFilter: null,
            headerFilter: null,
            selectionFilter: null
        };
    }

    initialize() {
        this.title = this.createTitleBar(this.titleLabel || this.container.id);
        this.initializeMoveHandlers(this.title);
        this.container.appendChild(this.title);
        this.titleHeight = this.title.offsetHeight;

        // Fetch the HTML file
        fetch("/extensions/BulkPropertiesExtension/BulkPropertiesPanel.html")
            .then(response => response.text())
            .then(data => {
                // Create a new div element
                const newDiv = document.createElement("div");
                // Set its innerHTML to the fetched HTML
                newDiv.style.width = "100%";
                newDiv.style.height = `calc(100% - ${this.titleHeight}px)`;
                newDiv.innerHTML = data;
                // Append the new div to the container
                this.container.appendChild(newDiv);

                this.modelSelectionSwitch = document.getElementById('modelSelectionSwitch');

                // Get the select element
                this.columnSelector = document.querySelector('#settingsSelector_div select');

                // Get the update table button
                let updateTableButton = document.getElementById('update_table_button');

                // Add an event listener for the click event
                updateTableButton.addEventListener('click', () => {
                    this.updateColumnSelector();
                    this.updateTable();
                    // You can add more functions here that will run when the button is clicked
                });
            })
            .catch((error) => {
                console.error('Error:', error);
            });
    }

    getSortedColumns() {
        // Filter out columns that start with "_", then modify the remaining columns to add a header filter
        const sortedColumns = this.extension.tableData.columns
            .filter(column => !column.title.startsWith("_"))
            .map(column => ({
                ...column,
                headerFilter: "input",
                minWidth: 150 // Set minimum column width to 150px
            }));

        // Sort the columns so that "Model" comes first and "Name" comes second
        sortedColumns.sort((a, b) => {
            if (a.title === 'Model') return -1;
            if (b.title === 'Model') return 1;
            if (a.title === 'Name') return -1;
            if (b.title === 'Name') return 1;
            return 0;
        });

        return sortedColumns;
    }

    createTable() {
        // Check if the table already exists
        if (this.table) {
            return;
        }

        if (!this.extension.tableData) {
            console.error('tableData is not defined');
            return;
        }

        const sortedColumns = this.getSortedColumns();

        this.combinedFilters.columnFilter = sortedColumns;

        // Create the Tabulator table and store it as a property of the BulkPropertiesPanel instance
        this.table = new Tabulator(document.getElementById('table_div'), {
            layout: 'fitColumns',
            data: this.extension.tableData.rows,
            columns: sortedColumns,
            rowClick: (e, row) => {
                // Get the data of the clicked row
                let rowData = row.getData();

                // Extract the dbId values
                let dbIds = rowData.dbId;  // Adjust this line as needed based on the structure of rowData

                // Get the model name
                let modelName = rowData.model;

                // Initialize model to null
                let model = null;

                // Iterate over the keys of targetNodesMap
                for (let [key, value] of this.extension.targetNodesMap.entries()) {
                    // Get the name of the model
                    let name = this.extension.getFileInfo(key, "name");

                    // If the name matches the model name, set the model to key
                    if (name === modelName) {
                        model = key;
                        break;
                    }
                }

                // If model is not null, create the selection definition and select the elements
                if (model) {
                    // Create the selection definition
                    let selectionDef = {
                        model: model,
                        ids: [dbIds],
                        // selectionType: 3  // Replace 1 with the actual selection type
                    };

                    // Select the corresponding model elements in the viewer
                    this.extension.viewer.setAggregateSelection([selectionDef], true);

                    // Isolate and fit the view to the selected elements
                    // Note: isolate and fitToView methods do not support aggregate selection directly
                    // You may need to iterate over the models and call these methods for each model
                    this.extension.viewer.isolate(dbIds, model);
                    this.extension.viewer.fitToView(dbIds, model);
                }
            }
        });

        // Get the download button
        let downloadTableButton = document.getElementById('download_table_button');

        // Add the event listener to the download button
        downloadTableButton.addEventListener("click", () => {
            this.table.download("csv", "data.csv");
        });
    }

    updateTable() {
        // Check if the table exists
        if (!this.table) {
            console.log('Table does not exist');
            return;
        }

        console.log('Updating table');

        // // Get the dataTable from the extension
        // this.tableData = this.extension.getTableData();

        // Get the current header filters
        this.combinedFilters.headerFilter = this.table.getHeaderFilters();

        // Get the sorted columns
        const sortedColumns = this.getSortedColumns();

        // Filter the sorted columns by columnFilter
        const filteredColumns = sortedColumns
            .filter(column => this.combinedFilters.columnFilter.some(filter => filter.title === column.title))
            .map(column => ({ ...column }));

        // Update the columns in the table
        this.table.setColumns(filteredColumns);

        // Reapply the header filters
        if (this.combinedFilters.headerFilter) {
            this.combinedFilters.headerFilter.forEach(filter => {
                this.table.setHeaderFilterValue(filter.field, filter.value);
            });
        }
        // Update the data
        this.table.setData(this.extension.tableData.rows);

        // Apply the selection filter
        if (this.combinedFilters.selectionFilter) {
            this.table.setFilter([
                {field:"modelDbId", type:"in", value: this.combinedFilters.selectionFilter}
            ]);
        } else {
            // Clear the filter when this.combinedFilters.selectionFilter is null
            this.table.clearFilter();
        }
        
        // Change the button class to "light"
        this.updateButtonClass('light');
    }

    createColumnSelector() {
        // Populate the select element with options
        this.extension.tableData.columns
            .filter(column => !column.title.startsWith("_"))
            .forEach((column, i) => {
                const columnLabel = column.title;
                const option = document.createElement('option');
                option.value = i;
                option.text = columnLabel;
                this.columnSelector.appendChild(option);
            });

        // Initialize Select2 on the select element
        $(this.columnSelector).select2({
            placeholder: 'Select or Type...', // Add a placeholder
        });

        $(this.columnSelector).on("change", () => {
            let selectedColumns = $(this.columnSelector).select2('data');

            // If the user cleared the selection, set selectedColumns to all properties
            if (selectedColumns.length === 0) {
                selectedColumns = this.extension.tableData.columns.map(column => column.title);
            } else {
                // Store the selected column texts in an instance variable
                selectedColumns = selectedColumns.map(item => item.text);
            }

            // Get the sorted columns
            const sortedColumns = this.getSortedColumns();

            // Filter the sorted columns by selectedColumns
            const filteredColumns = sortedColumns
                .filter(column => selectedColumns.includes(column.title));

            // Update the filteredColumns property
            this.combinedFilters.columnFilter = filteredColumns;

            // Change the button class to "warning"
            this.updateButtonClass('warning');
        });
    }
    
    updateColumnSelector() {

        const selectLength = this.columnSelector.length;

        // Store the current selected value
        const selectedValue = this.combinedFilters.columnFilter;

        // Clear the current options
        while (this.columnSelector.firstChild) {
            this.columnSelector.removeChild(this.columnSelector.firstChild);
        }

        // Get the sorted columns
        const sortedColumns = this.getSortedColumns();

        // Filter the sorted columns and populate the select element with new options
        sortedColumns.forEach((column, i) => {
            const columnLabel = column.title;
            const option = document.createElement('option');
            option.value = i;
            option.text = columnLabel;
            this.columnSelector.appendChild(option);
        });

        // Reselect the previously selected values, if they still exist in the options
        // Skip this step if all options are selected
        if (selectLength !== selectedValue.length) {
            selectedValue.forEach(column => {
                const index = sortedColumns.findIndex(sortedColumn => sortedColumn.title === column.title);
                if (index !== -1) {
                    this.columnSelector.options[index].selected = true;
                }
            });
        }

        // Trigger the change event to update the table columns
        $(this.columnSelector).trigger('change');
    }

    updateButtonClass(type) {
        const button = document.getElementById('update_table_button');
        if (type === 'light') {
            button.className = "btn btn-light m-2 btn-sm";
            button.innerHTML = "Update Table";
        } else if (type === 'warning') {
            button.className = "btn btn-warning m-2 btn-sm position-relative";
            button.innerHTML = `Update Table &#9888; 
                <span class="position-absolute top-0 start-100 translate-middle p-2 bg-danger border border-light rounded-circle">
                    <span class="visually-hidden">New alerts</span>
                </span>`;
        }
    }

}