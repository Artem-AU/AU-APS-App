let DATAGRID_CONFIG = {
    requiredProps: [], // Will be filled dynamically
    columns: [], // Will be filled dynamically
    groupBy: 'category', // Optional column to group by
    createRow: null, // Will be filled dynamically
    onRowClick: (row, viewer) => {
        viewer.isolate([row.dbid]);
        viewer.fitToView([row.dbid]);
    }
};

export class ReconstructPropsPanel extends Autodesk.Viewing.UI.DockingPanel {
    constructor(extension, id, title, options) {
        super(extension.viewer.container, id, title, options);
        this.extension = extension;
        this.container.style.left = (options.x || 0) + 'px';
        this.container.style.top = (options.y || 0) + 'px';
        this.container.style.width = (options.width || 800) + 'px';
        this.container.style.height = (options.height || 400) + 'px';
        this.container.style.resize = 'both'; // Allow both horizontal and vertical resizing
        this.container.style.overflow = 'auto'; // Add scrollbars if content overflows
    }

    // Assuming `props` is the array of properties for a model
    setupDataGridConfig(props) {
        // Fill requiredProps with all property names
        DATAGRID_CONFIG.requiredProps = props;

        // Create a column for each property
        DATAGRID_CONFIG.columns = props.map(prop => ({ title: prop, field: prop.toLowerCase() }));

        // Create a row for each property
        // Create a row for each property
        DATAGRID_CONFIG.createRow = (dbid, name, properties) => {
            const row = { dbid, name };
            for (const prop of DATAGRID_CONFIG.requiredProps) {
                const propObj = properties.find(p => p.displayName === prop);
                if (propObj) {
                    row[prop.toLowerCase()] = propObj.displayValue;
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
        this.content.style.height = 'calc(100% - 52px)';
        this.content.style.backgroundColor = 'white';
        this.content.innerHTML = `<div class="reconstructrop-container" style="position: relative; height: 350px;"></div>`;
        this.container.appendChild(this.content);
    }

    createTable() {
        this.table = new Tabulator('.reconstructrop-container', {
            height: '100%',
            layout: 'fitData',
            columns: DATAGRID_CONFIG.columns,
            groupBy: DATAGRID_CONFIG.groupBy,
            rowClick: (e, row) => DATAGRID_CONFIG.onRowClick(row.getData(), this.extension.viewer)
        });
    }

    update(model, dbids) {
        model.getBulkProperties(dbids, { propFilter: DATAGRID_CONFIG.requiredProps }, (results) => {
            this.table.replaceData(results.map((result) => DATAGRID_CONFIG.createRow(result.dbId, result.name, result.properties)));
        }, (err) => {
            console.error(err);
        });
    }
}