let DATAGRID_CONFIG = {
    requiredProps: [], // Will be filled dynamically
    columns: [], // Will be filled dynamically
    createRow: null, // Will be filled dynamically
    onRowClick: (row, viewer) => {
        viewer.isolate([row.dbid]);
        viewer.fitToView([row.dbid]);
    }
};

export class ExportPropsPanel extends Autodesk.Viewing.UI.DockingPanel {
    constructor(extension, id, title, options) {
        super(extension.viewer.container, id, title, options);
        this.extension = extension;
        this.container.style.left = (options.x || 0) + 'px';
        this.container.style.top = (options.y || 0) + 'px';
        this.container.style.width = (options.width || 1500) + 'px';
        this.container.style.height = (options.height || 600) + 'px';
        this.container.style.maxwidth = '3000px';
        this.container.style.resize = 'both'; // Allow both horizontal and vertical resizing
        this.container.style.overflow = 'hidden'; // Add scrollbars if content overflows

        this.notificationContainer = document.createElement('div');
        this.notificationContainer.id = 'notificationContainer';
        this.container.appendChild(this.notificationContainer);
    }

    setFileName(fileName) {
        this.fileName = fileName;
    }

    setupDataGridConfig(props) {

        DATAGRID_CONFIG.requiredProps = props;

        // Create a column for each property
        DATAGRID_CONFIG.columns = [
            { title: 'Name', field: 'name' }, // Add 'Name' column
            ...props
                .filter((prop, index, self) => {
                    // Remove duplicates
                    return self.indexOf(prop) === index;
                })
                .map(prop => {
                    // Replace invalid characters
                    const field = prop.toLowerCase().replace(/[^a-z0-9_]/g, '_');
                    return { title: prop, field };
                })
        ];

        // Create a row for each property
        DATAGRID_CONFIG.createRow = (dbid, name, properties) => {
            // Remove the part of the name in brackets
            name = name.replace(/\s*\[.*?\]\s*/g, '');

            const row = { dbid, name };
            // console.log('properties:', properties);
            for (const prop of DATAGRID_CONFIG.requiredProps) {
                const [displayCategory, displayName] = prop.split('/');
                const propObj = properties.find(p => p.displayName === displayName && p.displayCategory === displayCategory);
                if (propObj) {
                    const field = prop.toLowerCase().replace(/[^a-z0-9_]/g, '_');
                    row[field] = propObj.displayValue;
                }
            }
            return row;
        };
    }
    
    initialize() {
        this.title = this.createTitleBar(this.titleLabel || this.container.id);
        this.initializeMoveHandlers(this.title);
        this.container.appendChild(this.title);
        this.content = document.createElement('div');
        let titleHeight = this.title.offsetHeight;
        this.content.style.height = `calc(100% - ${titleHeight}px)`;
        this.content.style.backgroundColor = 'white';
        this.content.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 3px; height: 30px;">
                <span style="color: black; align-self: center; padding: 0 10px;">Filter:</span>
                <div style="justify-content: flex-start; align-items: center; flex-grow: 1; height: 30px;">
                    <select id="property-dropdown" style="width: 80%; height: 100%; overflow: hidden;" multiple></select>
                </div>
                <button id="download-csv" style="background-color: lightgreen; color: black; border: solid black 1px; display: flex; align-items: center; justify-content: center; border-radius: 5px; cursor: pointer; width: 50px; height: 20px;">
                    <img src="https://cdn4.iconfinder.com/data/icons/ionicons/512/icon-ios7-cloud-download-outline-64.png" alt="Download Icon" style="height: 20px; margin-right: 5px;">
                    CSV
                </button>
            </div>
            <div class="exportprop-container" style="position: relative; height: calc(100% - 36px);"></div>
        `;
        // After appending the content to the container
        this.container.appendChild(this.content);

        // Initialize Select2 on the #property-dropdown
        $('#property-dropdown').select2();

        // Add event listener to the button
        document.getElementById('download-csv').addEventListener('click', () => {
            this.table.download('csv', `${this.fileName}.csv`);
        });
    }

    createTable() {
        this.table = new Tabulator('.exportprop-container', {
            layout: 'fitColumns',
            columns: [
                {title: "Name", field: "name", width: 200}, // Set width to 100px
                ...DATAGRID_CONFIG.columns.slice(1) // Rest of the columns
            ],
            groupBy: DATAGRID_CONFIG.groupBy,
            rowClick: (e, row) => DATAGRID_CONFIG.onRowClick(row.getData(), this.extension.viewer)
        });
    }

    showNotification(message) {
        this.notificationContainer.innerHTML = `<div class="notification">${message}</div>`;
        this.notificationContainer.style.display = 'block'; // Show the notification container
    }

    clearNotification() {
        this.notificationContainer.innerHTML = '';
        this.notificationContainer.style.display = 'none'; // Hide the notification container
    }

    update(model, dbids) {
        // Show notification
        this.showNotification('Updating data, please wait...');

        const promises = dbids.map(dbId => new Promise((resolve, reject) => {
            model.getProperties(dbId, result => {
                // Filter properties based on DATAGRID_CONFIG.requiredProps
                const filteredProps = result.properties.filter(prop => 
                    DATAGRID_CONFIG.requiredProps.includes(`${prop.displayCategory}/${prop.displayName}`));
                const resolvedObject = {
                    dbId: result.dbId,
                    name: result.name,
                    properties: filteredProps
                };
                resolve(resolvedObject);
            }, reject);
        }));

        Promise.all(promises).then(results => {
            // console.log('results:', results);
            this.table.replaceData(results.map(result => {
                const rowData = DATAGRID_CONFIG.createRow(result.dbId, result.name, result.properties);
                // console.log('rowData:', rowData);
                return rowData;
            }));

            // Clear notification
            this.clearNotification();
        }).catch(err => {
            console.error(err);

            // Show error notification
            this.showNotification('An error occurred while updating data.');
        });
    }
}