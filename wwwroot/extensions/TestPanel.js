export class TestPanel extends Autodesk.Viewing.UI.DockingPanel {
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
}