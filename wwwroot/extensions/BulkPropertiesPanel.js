export class BulkPropertiesPanel extends Autodesk.Viewing.UI.DockingPanel {
    constructor(extension, id, title, options) {
        super(extension.viewer.container, id, title, options);
        this.extension = extension;
        this.container.style.left = (options.x || 0) + 'px';
        this.container.style.top = (options.y || 0) + 'px';
        this.container.style.width = (options.width || 1200) + 'px';
        this.container.style.height = (options.height || 600) + 'px' 
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
        this.dashboardDiv.style.justifyContent = 'flex-end';       

        this.tableDiv = document.createElement('div');
        this.tableDiv.id = 'table_div';
        this.tableDiv.textContent = 'Table Div';
        this.tableDiv.style.backgroundColor = 'lightgrey';
        this.tableDiv.style.minWidth = '1000px';  // Minimum width of 800px
        // this.tableDiv.style.flex = '0 0 800px';  // Take up the remaining space
        this.tableDiv.style.overflow = 'auto';  // Add scrollbar when content overflows
        this.dashboardDiv.appendChild(this.tableDiv);

        this.settingsDiv = document.createElement('div');
        this.settingsDiv.id = 'settings_div';

        // Create a new span for the text
        let filtersSpan = document.createElement('span');
        filtersSpan.textContent = 'Filters:';
        filtersSpan.style.padding = '5px';
        filtersSpan.style.fontSize = '18px';
        filtersSpan.style.color = 'black';
        filtersSpan.style.fontWeight = 'bold'; // Make the text bold
        // filtersSpan.style.textDecoration = 'underline'; // Underline the text
        filtersSpan.style.borderBottom = '1px solid black'; // Add a black border
        filtersSpan.style.margin = '0 5px'; // Add some margin on the sides
        this.settingsDiv.appendChild(filtersSpan); // Append the span to the div

        // // Create a new horizontal line element
        // let horizontalLine = document.createElement('hr');
        // horizontalLine.style.margin = '0 10px'; // Add some margin on the sides

        // this.settingsDiv.appendChild(horizontalLine); // Append the horizontal line to the div

        this.settingsDiv.style.backgroundColor = 'lightsteelblue';
        this.settingsDiv.style.minWidth = '200px';  // Minimum width of 200px  
        this.settingsDiv.style.width = '200px';  // Fixed width of 200px
        this.settingsDiv.style.display = 'flex';
        this.settingsDiv.style.flexDirection = 'column';
        this.settingsDiv.style.boxSizing = 'border-box'; // Include padding and border in element's total width

        // Create a new div for the toggle
        this.settingsToggleDiv = document.createElement('div');
        this.settingsToggleDiv.id = 'toggle_div';
        this.settingsToggleDiv.textContent = 'Model Selection: OFF';
        this.settingsToggleDiv.style.color = 'black';
        this.settingsToggleDiv.style.backgroundColor = 'lightyellow';
        // this.settingsToggleDiv.style.padding = '10px';
        this.settingsToggleDiv.style.cursor = 'pointer';
        // this.settingsToggleDiv.style.border = '1px solid black';
        this.settingsToggleDiv.style.borderRadius = '5px';
        this.settingsToggleDiv.style.textAlign = 'center';
        this.settingsToggleDiv.style.lineHeight = '2';
        this.settingsToggleDiv.style.boxSizing = 'border-box'; // Include padding and border in element's width
        // this.settingsToggleDiv.style.width = '100%'; // Set the width to 100% of the parent div 
        this.settingsToggleDiv.style.margin = '10px'; // Center the div within its parent
        this.settingsDiv.appendChild(this.settingsToggleDiv);

        // Create a new div for the column selector
        this.settingsSelectorDiv = document.createElement('div');
        this.settingsSelectorDiv.id = 'settingsSelector_div';
        this.settingsSelectorDiv.style.backgroundColor = 'lightsteelblue';
        this.settingsSelectorDiv.style.flex = '0 0 200px';  // Fixed width of 20%
        this.settingsSelectorDiv.style.boxSizing = 'border-box'; // Include padding and border in element's width
        this.settingsSelectorDiv.style.width = '100%'; // Set the width to 100% of the parent div
        // this.settingsToggleDiv.style.width = '100%'; // Set the width to 100% of the parent div 
        // this.settingsSelectorDiv.style.margin = '10px'; // Center the div within its parent
        // this.settingsSelectorDiv.style.display = 'flex';
        // this.settingsSelectorDiv.style.flexDirection = 'column';
        this.settingsDiv.appendChild(this.settingsSelectorDiv);

        this.dashboardDiv.appendChild(this.settingsDiv);
    }

    createTable() {
        // Check if the table already exists
        if (this.table) {
            return;
        }

        // Get the dataTable from the extension
        this.tableData = this.extension.getTableData();

        //log tableData.rows
        console.log('tableData.rows', this.tableData.rows);
        //log tableData.columns
        console.log('tableData.columns', this.tableData.columns);

        if (!this.tableData) {
            console.error('tableData is not defined');
            return;
        }

        // Filter out columns that start with "_", then modify the remaining columns to add a header filter
        const columnsWithFilter = this.tableData.columns
            .filter(column => !column.title.startsWith("_"))
            .map(column => ({
                ...column,
                headerFilter: "input",
                width: column.title === 'Name' ? 150 : column.width, // Set the width to 150 if the column title is "Name"
                minWidth: 50 // Set minimum column width to 120px
            }));

        // Sort the columns so that "Name" comes first
        columnsWithFilter.sort((a, b) => {
            if (a.title === 'Name') return -1;
            if (b.title === 'Name') return 1;
            return 0;
        });

        // Create the Tabulator table and store it as a property of the BulkPropertiesPanel instance
        this.table = new Tabulator(this.tableDiv, {
            layout: 'fitColumns',
            data: this.tableData.rows,
            columns: columnsWithFilter,
            rowClick: (e, row) => {
                // Get the data of the clicked row
                let rowData = row.getData();

                // Extract the dbId values
                let dbIds = rowData.dbId;  // Adjust this line as needed based on the structure of rowData

                // Select, isolate, and fit the corresponding model elements in the viewer
                this.extension.viewer.select(dbIds);
                this.extension.viewer.isolate(dbIds);
                this.extension.viewer.fitToView(dbIds);
            }
        });
    }

    createColumnSelector() {
        // Clear the settingsSelectorDiv
        while (this.settingsSelectorDiv.firstChild) {
            this.settingsSelectorDiv.removeChild(this.settingsSelectorDiv.firstChild);
        }

        // Get the dataTable from the extension
        this.tableData = this.extension.getTableData();

        // Create a label element
        const label = document.createElement('label');
        label.textContent = 'Property Set:';
        label.style.color = 'black';
        label.style.display = 'block'; // Make the label display as a block element

        // Append the label element to the settingsSelectorDiv
        this.settingsSelectorDiv.appendChild(label);

        // Create a select element
        const select = document.createElement('select');
        select.multiple = true; // Allow multiple selections
        select.style.boxSizing = 'border-box'; // Include padding and border in element's width
        select.style.margin = '10px'; // Add some margin on the sides
        select.style.width = '100%'; // Set the width to 100% of the parent div
        // select.style.padding = '10px';

        // Populate the select element with options
        this.tableData.columns
            .filter(column => !column.title.startsWith("_"))
            .forEach((column, i) => {
                const columnLabel = column.title;
                const option = document.createElement('option');
                option.value = i;
                option.text = columnLabel;
                select.appendChild(option);
            });
        // Append the select element to the settingsSelectorDiv
        this.settingsSelectorDiv.appendChild(select);

        // Initialize Select2 on the select element
        $(select).select2({
            placeholder: 'Select or Type...', // Add a placeholder
        });

        $(select).on("change", () => {
            let selectedColumns = $(select).select2('data');

            // If the user cleared the selection, set selectedColumns to all properties
            if (selectedColumns.length === 0) {
                selectedColumns = this.tableData.columns.map(column => column.title);
            } else {
                // Store the selected column texts in an instance variable
                selectedColumns = selectedColumns.map(item => item.text);
            }

            // Filter out columns that start with "_", then modify the remaining columns to add a header filter
            const filteredColumns = this.tableData.columns
                .filter(column => !column.title.startsWith("_") && selectedColumns.includes(column.title))
                .map(column => ({
                    ...column,
                    headerFilter: "input",
                    width: column.title === 'Name' ? 150 : column.width, // Set the width to 150 if the column title is "Name"
                    minWidth: column.minWidth // Preserve the original minWidth
                }));

            // Sort the columns so that "Name" comes first
            filteredColumns.sort((a, b) => {
                if (a.title === 'Name') return -1;
                if (b.title === 'Name') return 1;
                return 0;
            });

            // Get the current header filters
            const currentFilters = this.table.getHeaderFilters();

            // Update the columns in the table
            this.table.setColumns(filteredColumns);

            // Reapply the header filters
            currentFilters.forEach(filter => {
                this.table.setHeaderFilterValue(filter.field, filter.value);
            });
        });
    }


    createToggle() {
        // Add an event listener for the click event
        this.settingsToggleDiv.addEventListener('click', () => {
            // Toggle the 'on' class and change the background color
            if (this.settingsToggleDiv.classList.contains('on')) {
                this.settingsToggleDiv.classList.remove('on');
                this.settingsToggleDiv.style.backgroundColor = 'lightgrey';
                this.settingsToggleDiv.textContent = 'Model Selection: OFF';
                console.log('Toggle off');
                this.extension.isFilterBySelectedEnabled = false; // Update the property
            } else {
                this.settingsToggleDiv.classList.add('on');
                this.settingsToggleDiv.style.backgroundColor = 'lightgreen'; // Changed to green
                this.settingsToggleDiv.textContent = 'Model Selection: ON';
                console.log('Toggle on');
                this.extension.isFilterBySelectedEnabled = true; // Update the property
            }
        });

        // Add some styles to make the toggle look more like a switch
        this.settingsToggleDiv.style.border = '1px solid grey';
        this.settingsToggleDiv.style.borderRadius = '5px';
        this.settingsToggleDiv.style.textAlign = 'center';
        // this.settingsToggleDiv.style.lineHeight = '2';
    }



    
}