import { loadModel } from '../viewer.js';  // Make sure the path is correct



export class TestPanel extends Autodesk.Viewing.UI.DockingPanel {
    constructor(extension, id, title, options) {
        super(extension.viewer.container, id, title, options);
        this.extension = extension;
        this.container.style.left = (options.x || 0) + 'px';
        this.container.style.top = (options.y || 0) + 'px';
        this.container.style.width = (options.width || 600) + 'px';
        this.container.style.height = (options.height || 600) + 'px';
        this.totalModels = 0; // Set this to the total number of models you're loading
        this.loadedModels = 0;
        this.modelsToLoad = []; // Initialize as an empty array
        this.extension.viewer.addEventListener(Autodesk.Viewing.GEOMETRY_LOADED_EVENT, this.onGeometryLoaded.bind(this));
    }

    initialize() {
        this.title = this.createTitleBar(this.titleLabel || this.container.id);
        this.initializeMoveHandlers(this.title);
        this.container.appendChild(this.title);
        this.dashboardDiv = document.createElement('div');
        this.container.appendChild(this.dashboardDiv);
        let titleHeight = this.title.offsetHeight;
        this.dashboardDiv.style.height = `calc(100% - ${titleHeight}px)`;
        this.dashboardDiv.style.backgroundColor = 'white';

        // Create a select element
        this.select = document.createElement('select');
        this.select.multiple = true; // Make it a multi-select dropdown
        this.select.id = 'mySelect2'; // Give it an id for easy reference
        this.select.style.width = '100%'; // Make the select element take up the full width of its container
        this.dashboardDiv.appendChild(this.select);

        console.log('In initialize, this.select:', this.select);  // Add this line

        // Create a button element
        this.button = document.createElement('button');
        this.button.textContent = 'Federate Models'; // Set the button's text
        this.button.style.width = '100%'; // Make the button take up the full width of its container
        this.dashboardDiv.appendChild(this.button);

        // Handle the button's click event
        this.button.addEventListener('click', () => {
            const selectedUrns = $(this.select).val();
            this.loadedModels = 0; // Reset loadedModels to 0
            this.totalModels = selectedUrns.length; // Set totalModels to the number of selected models
            console.log(' click Selected URNs:', selectedUrns);

            // Load the selected models
            this.modelsToLoad = selectedUrns.map(urn => loadModel(this.extension.viewer, urn));
            Promise.all(this.modelsToLoad)
                .then(bubbles => {
                    bubbles.forEach(bubble => {
                        this.extension.viewer.loadDocumentNode(bubble.getDocument(), bubble);
                    });
                })
                .catch(error => console.error('Failed to load models:', error));
        });


        // Initialize Select2 on the select element
        $(document).ready(() => {  // Use an arrow function here
            $('#mySelect2').select2();
            this.populateDropdown(this.extension.viewer);  // Now 'this' refers to the TestPanel instance
        });
    }

    // In your onGeometryLoaded method
    onGeometryLoaded(event) {
        console.log('---TestPanel onGeometryLoaded event loadedModels:', this.loadedModels);
        console.log('---TestPanel onGeometryLoaded event totalModels:', this.totalModels);
        const index = this.modelsToLoad.indexOf(event.model);
        if (index !== -1) {
            this.modelsToLoad.splice(index, 1);
            this.loadedModels++;
            console.log('---TestPanel Model loaded:', event.model);
            console.log('---TestPanel this.loadedModels:', this.loadedModels);
        }

        if (this.loadedModels === this.totalModels) {
            this.onAllModelsLoaded();
        }
    }

    onAllModelsLoaded() {
        // This method will be called when all models are loaded
        console.log('---TestPanel All models are loaded');
    }

    async populateDropdown(viewer) {
        console.log('In populateDropdown, this.select:', this.select);  // Add this line

        this.select.innerHTML = '';
        try {
            const resp = await fetch('/api/models');
            if (!resp.ok) {
                throw new Error(await resp.text());
            }
            const models = await resp.json();
            this.select.innerHTML = models.map(model => `<option value=${model.urn}>${model.name}</option>`).join('\n');
            $(this.select).on('change', () => this.onModelsSelected(viewer, $(this.select).val()));
            if (this.select.value) {
                this.onModelsSelected(viewer, $(this.select).val());
            }
        } catch (err) {
            alert('Could not list models. See the console for more details.');
            console.error(err);
        }
    }

    onModelsSelected(viewer, selectedUrns) {
        // Implement this method to handle model selection
        console.log('Selected URNs:', selectedUrns);
    }
}