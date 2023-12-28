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
        this.container.style.width = (options.width || 800) + 'px';
        this.container.style.height = (options.height || 600) + 'px';
        this.container.style.resize = 'both'; // Allow both horizontal and vertical resizing
        this.container.style.overflow = 'auto'; // Add scrollbars if content overflows

        this.notificationContainer = document.createElement('div');
        this.notificationContainer.id = 'notificationContainer';
        this.container.appendChild(this.notificationContainer);
    }

    setFileName(fileName) {
        this.fileName = fileName;
    }

    setupDataGridConfig(props) {

        // Fill requiredProps with all property names
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
            for (const prop of DATAGRID_CONFIG.requiredProps) {
                const [displayCategory, displayName] = prop.split('.');
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
        this.content.style.height = 'calc(100% - 93px)';
        this.content.style.backgroundColor = 'white';
        this.content.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 3px 3px;">
                <span style="color: black; align-self: center; padding: 0 10px;">Filter:</span>
                <div style="display: flex; justify-content: flex-start; align-items: center; flex-grow: 1;">
                    <select id="property-dropdown" style="width: 80%; overflow: hidden;" multiple></select>
                </div>
                <button id="download-csv" style="background-color: lightgreen; color: black; display: flex; align-items: center; justify-content: center; border-radius: 5px; cursor: pointer; width: 50px; height: 20px;">
                    <img src="https://cdn3.iconfinder.com/data/icons/internet-relative/200/Download-64.png" alt="Download Icon" style="height: 20px; margin-right: 5px;">
                    CSV
                </button>
            </div>
            <div class="exportprop-container" style="position: relative; height: 350px;"></div>
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
            height: '100%',
            layout: 'fitDataFill',
            columns: DATAGRID_CONFIG.columns,
            groupBy: DATAGRID_CONFIG.groupBy,
            rowClick: (e, row) => DATAGRID_CONFIG.onRowClick(row.getData(), this.extension.viewer)
        });
    }

    showNotification(message) {
        console.log('showNotification called with message:', message);
        this.notificationContainer.innerHTML = `<div class="notification">${message}</div>`;
        this.notificationContainer.style.display = 'block'; // Show the notification container
    }

    clearNotification() {
        console.log('clearNotification called');
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
                    DATAGRID_CONFIG.requiredProps.includes(`${prop.displayCategory}.${prop.displayName}`));
                
                const resolvedObject = {
                    dbId: result.dbId,
                    name: result.name,
                    properties: filteredProps
                };

                resolve(resolvedObject);
            }, reject);
        }));

        Promise.all(promises).then(results => {
            this.table.replaceData(results.map(result => {
                const rowData = DATAGRID_CONFIG.createRow(result.dbId, result.name, result.properties);
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