export class SearchSetsPanel extends Autodesk.Viewing.UI.DockingPanel {
    constructor(extension, id, title, options) {
        super(extension.viewer.container, id, title, options);
        this.extension = extension;
        this.container.style.right = (options.x || 0) + 'px';
        this.container.style.top = (options.y || 0) + 'px';
        this.container.style.width = (options.width || 700) + 'px';
        this.container.style.height = (options.height || 650) + 'px';
    }

    initialize() {
        this.title = this.createTitleBar(this.titleLabel || this.container.id);
        this.initializeMoveHandlers(this.title);
        this.container.appendChild(this.title);
        this.closer = this.createCloseButton();
        this.initializeCloseHandler(this.closer);
        this.container.appendChild(this.closer);

        // Fetch the HTML file
        fetch("/extensions/SearchSetsExtension/SearchSetsPanel.html")
            .then(response => response.text())
            .then(data => {
                // Create a new div element
                const newDiv = document.createElement("div");
                newDiv.classList.add('bootstrap-contents-div');
                newDiv.innerHTML = data;
                // Append the new div to the container
                this.container.appendChild(newDiv);

                // Get UI elements
                //loadedTasks
                this.loadedTasks = document.querySelector('#loadedTasks');
                this.loadedSearchSets = document.querySelector('#loadedSearchSets');
                this.taskDropdown = document.querySelector('#taskDropdown');

                this.setUpPanel = document.querySelector('#setUpPanel');
                this.workAreasReportPanel = document.querySelector('#workAreasReportPanel');
                this.zoneInput = document.querySelector('#zone');
                this.subzoneInput = document.querySelector('#subzone');
                this.workareaInput = document.querySelector('#workarea');
                this.modelSelectionSwitch = document.querySelector('#modelSelectionSwitch');
                this.hideMappedSwitch = document.querySelector('#hideMappedSwitch');
                this.hideWorkAreasSwitch = document.querySelector('#hideWorkAreasSwitch');
                this.propertyDropdown = document.querySelector('#propertyDropdown');
                this.valueDropdown = document.querySelector('#valueDropdown');
                this.createWorkAreaButton = document.querySelector('#createWorkAreaButton');
                this.workAreaCodeInput = document.querySelector('#workAreaCodeInput');
                this.mappingDropdown = document.querySelector('#mappingDropdown');
                this.downloadMappingButton = document.querySelector('#downloadMappingButton');
                this.createIfcButton = document.querySelector('#createIfcButton');
                this.reportDiv = document.querySelector('#report');
                this.reportEditButton = document.querySelector('#reportEditButton');
                this.reportDeleteButton = document.querySelector('#reportDeleteButton');
                this.editForm = document.querySelector('#editForm');
                this.cancelEdit = document.querySelector('#cancelEdit');

                // Initialize tooltip for modelSelectionSwitch
                const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
                const tooltipList = Array.from(tooltipTriggerList).map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl, {
                    delay: {
                        show: 500,
                        // hide: 0
                    }
                }));

                // Add event listener to the tasks input
                this.loadedTasks.addEventListener('change', (event) => {
                    const file = event.target.files[0];
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const lines = event.target.result.split('\n');
                        this.tasks = lines.slice(1).map(line => {
                            const [, ActionName, ParentTaskId, TaskId, TaskCode, IsCreatedTask, Name, StartDateTime, FinishDateTime] = line.split('\t');
                            return { ActionName, ParentTaskId, TaskId, TaskCode, IsCreatedTask, Name, StartDateTime, FinishDateTime };
                        });

                        // Clear the dropdown
                        this.taskDropdown.innerHTML = '';

                        // Populate the dropdown with task names
                        this.tasks.forEach(task => {
                            const option = document.createElement('option');
                            option.value = task.TaskId;
                            option.text = task.Name;
                            this.taskDropdown.add(option);
                        });
                    };
                    reader.readAsText(file);
                });

                // Add event listener to the search sets input
                this.loadedSearchSets.addEventListener('change', (event) => {
                    const file = event.target.files[0];
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const lines = event.target.result.split('\n');
                        this.searchSets = lines.slice(1).map(line => {
                            const [, ActionName, TaskId, TaskName, TaskCode, ModelName, BehaviourType, AnyOfTheseMode, SearchSetGroup, PropertyName, Operator, PropertyValue] = line.split('\t');
                            return { ActionName, TaskId, TaskName, TaskCode, ModelName, BehaviourType, AnyOfTheseMode, SearchSetGroup, PropertyName, Operator, PropertyValue };
                        });
                        console.log(this.searchSets);
                    };
                    reader.readAsText(file);
                });

                this.taskDropdown.addEventListener('change', (event) => {
                    this.selectedTaskId = event.target.value;
                    console.log(`Selected task ID: ${this.selectedTaskId}`);
                    this.taskToDbids();
                });



            
                // Add an 'input' event listener to each input field
                [this.zoneInput, this.subzoneInput, this.workareaInput].forEach(input => {
                    input.addEventListener('input', () => {
                        // If the input field is empty, the modelSelectionSwitch is checked, and there's no badge, add a badge
                        if (!input.value && this.modelSelectionSwitch.checked && !input.parentNode.querySelector('.position-absolute')) {
                            this.addBadge(input);
                            this.updateWorkAreaCode();
                        }
                        // If the input field has a value and a badge, remove the badge
                        else if (input.value && input.parentNode.querySelector('.position-absolute')) {
                            this.removeBadge(input);
                        }

                        // If all input fields are filled
                        if (this.zoneInput.value && this.subzoneInput.value && this.workareaInput.value) {
                            this.updateWorkAreaCode();
                        }
                    });
                });

                // Add an event listener for the change event
                this.modelSelectionSwitch.addEventListener('change', () => {
                    if (this.modelSelectionSwitch.checked) {
                        // Check each input individually
                        ['workarea', 'subzone', 'zone'].forEach(id => {
                            const input = document.getElementById(id);
                            // Add a badge to the input
                            if (!input.value) {
                                this.addBadge(input);
                            } 
                        });
                        this.updateWorkAreaCode();
                    } else {
                        this.workAreaCodeInput.value = '';
                        this.propertyDropdown.innerHTML = '';
                        this.valueDropdown.innerHTML = '';
                        this.createWorkAreaButton.disabled = true;
                        this.extension.viewer.impl.removeOverlayScene('temp-overlay');

                        // Remove badges from the inputs
                        ['workarea', 'subzone', 'zone'].forEach(id => {
                            const input = document.getElementById(id);
                            const badge = input.parentNode.querySelector('.position-absolute');
                            if (badge) {
                                this.removeBadge(input);
                            }
                        });
                    }
                });

                // Add an event listener for the click event
                this.hideMappedSwitch.addEventListener('click', () => {
                    if (this.hideMappedSwitch.checked) {
                        // Code to execute when the switch is checked
                        for (let mesh of this.extension.bBoxMeshes) {
                            this.hideModelElements(mesh);
                        }
                    } else {
                        // Code to execute when the switch is unchecked
                        this.extension.viewer.showAll();
                    }
                });

                // Add an event listener for the change event
                this.hideWorkAreasSwitch.addEventListener('change', () => {
                    if (this.hideWorkAreasSwitch.checked) {
                        // Clear everything from the permanent overlay
                        this.extension.viewer.impl.clearOverlay('perm-overlay');
                    } else {
                        this.redrawMeshes();
                    }
                });

                this.valueDropdown.addEventListener('change', () => {
                    if (this.valueDropdown.value && this.modelSelectionSwitch.checked) {
                        this.createWorkAreaButton.disabled = false;
                    } else {
                        this.createWorkAreaButton.disabled = true;
                    }
                });

                // Add an event listener for the click event
                this.createWorkAreaButton.addEventListener('click', async () => {
                    await this.createWorkArea();
                    this.propertyDropdown.innerHTML = '';
                    this.valueDropdown.innerHTML = '';
                    this.workareaInput.value = '';
                    this.updateWorkAreaCode();
                    this.createIfcButton.disabled = false;
                    this.hideMappedSwitch.disabled = false;
                    this.hideMappedSwitch.checked = true;
                    this.hideWorkAreasSwitch.disabled = false;

                    // Trigger the click event on the hideMappedSwitch
                    this.hideMappedSwitch.dispatchEvent(new Event('click'));

                    // Trigger the change event on the modelSelectionSwitch
                    this.modelSelectionSwitch.dispatchEvent(new Event('change'));

                    // this.createTabulatorTable(this.extension.bBoxMeshes);

                    // Create the table if it doesn't exist, otherwise update the data
                    if (!this.table) {
                        this.createTabulatorTable(this.extension.bBoxMeshes);
                    } else {
                        this.table.setData(this.bBoxToTabulatorData(this.extension.bBoxMeshes));
                    }
                });

                this.mappingDropdown.addEventListener('change', () => {
                    // Check if any option is selected
                    if (this.mappingDropdown.value) {
                        this.downloadMappingButton.disabled = false;
                    } else {
                        this.downloadMappingButton.disabled = true;
                    }
                });

                // Add an event listener for the click event
                this.downloadMappingButton.addEventListener('click', () => {
                    // Do some stuff here
                    this.downloadMapping();
                });

                // Add an event listener for the click event
                this.createIfcButton.addEventListener('click', () => {
                    // Do some stuff here
                    this.createIfc();
                });

                this.reportEditButton.addEventListener('click', () => {
                    this.toggleEditWorkAreaFormVisibility();
                });

                this.reportDeleteButton.addEventListener('click', () => {
                    if (this.selectedRowData) {
                        // Find the mesh with the selected UUID
                        let meshToDelete = this.extension.bBoxMeshes.find(mesh => mesh.uuid === this.selectedRowData.MeshId);

                        if (meshToDelete) {
                            // Filter out the mesh from the bBoxMeshes array
                            this.extension.bBoxMeshes = this.extension.bBoxMeshes.filter(mesh => mesh !== meshToDelete);

                            // Delete the row from the Tabulator table
                            this.table.deleteRow(this.selectedRowData.MeshId);

                            this.redrawMeshes();
                        }

                        this.updateMappingDropdown();
                    }
                });

                this.editForm.addEventListener('submit', (event) => {
                    event.preventDefault(); // Prevent the form from submitting normally

                    // Get the values from the form inputs
                    let zoneEdit = document.getElementById('zoneEdit').value;
                    let subzoneEdit = document.getElementById('subzoneEdit').value;
                    let workareaEdit = document.getElementById('workareaEdit').value;

                    // Get the MeshId from the selected row data
                    let meshId = this.selectedRowData.MeshId;

                    // Find the mesh with this id
                    let mesh = this.extension.bBoxMeshes.find(mesh => mesh.uuid === meshId);

                    // Override the values in mesh.userData.pds
                    if (mesh) {
                        mesh.userData.pds.zone = zoneEdit;
                        mesh.userData.pds.subzone = subzoneEdit;
                        mesh.userData.pds.workArea = workareaEdit;
                    }

                    // Update the table row with the new values
                    this.table.setData(this.bBoxToTabulatorData(this.extension.bBoxMeshes));
                    // this.table.updateData([{MeshId: meshId, Zone: zoneEdit, Subzone: subzoneEdit, WorkArea: workareaEdit}]);          
                    this.toggleEditWorkAreaFormVisibility();
                });

                this.cancelEdit.addEventListener('click', () => {
                    this.toggleEditWorkAreaFormVisibility();
                });

                this.createTabulatorTable(this.extension.bBoxMeshes);

            })
            .catch((error) => {
                console.error('Error:', error);
            });
    }

    taskToDbids() {
        // Filter the searchSets array to get the search sets for the selected task
        const selectedSearchSets = this.searchSets.filter(searchSet => searchSet.TaskId === this.selectedTaskId);

        console.log(selectedSearchSets); // Log the selected search sets

        // Initialize an empty Map
        const pSetKeys = new Map();

        // Iterate over the selectedSearchSets
        for (const searchSet of selectedSearchSets) {
            // Replace the dot in the PropertyName with a forward slash
            const formattedPropertyName = searchSet.PropertyName.replace('.', '/');

            // If the pSetKeys Map already has the formattedPropertyName as a key, push the PropertyValue to the existing array
            if (pSetKeys.has(formattedPropertyName)) {
                pSetKeys.get(formattedPropertyName).push(searchSet.PropertyValue);
            } 
            // If the pSetKeys Map does not have the formattedPropertyName as a key, add a new key-value pair with the formattedPropertyName and an array containing the PropertyValue
            else {
                pSetKeys.set(formattedPropertyName, [searchSet.PropertyValue]);
            }
        }

        console.log("pSetKeys", pSetKeys);

        console.log(this.extension.viewer.model);
        console.log(this.extension.targetNodesMap);

        // Get the first object from this.targetNodesMap
        const firstTargetNodesMapObject = this.extension.targetNodesMap.values().next().value;

        // Call getPropertySetAsync with the dbIds from the first object in this.targetNodesMap
        this.extension.viewer.model.getPropertySetAsync(firstTargetNodesMapObject, {})
            .then(propertySet => {
                console.log("propertySet", propertySet); // Log the PropertySet

                // Initialize an empty array to store the dbIds
                const dbIds = [];

                // Iterate over the keys in pSetKeys
                for (const key of pSetKeys.keys()) {
                    console.log("key", key); // Log the key

                    // Iterate over the objects in propertySet
                    for (const property of propertySet) {
                        // Check if the key exists in the object
                        if (property.hasOwnProperty(key)) {
                            console.log("property[key]", property[key]); // Log the value for this key

                            // Get the values for this key from pSetKeys and remove the \r character
                            const values = pSetKeys.get(key).map(value => value.trim());

                            // Check if the displayValue is in the values
                            if (values.includes(property.displayValue)) {
                                // If it is, add the dbId to the dbIds array
                                dbIds.push(property.dbId);
                            }
                        }
                    }
                }

                console.log("dbIds", dbIds); // Log the dbIds
            });

        return pSetKeys;
    }

    toggleEditWorkAreaFormVisibility() {
        if (this.editForm.classList.contains('visually-hidden')) {
            // If the form is hidden, show it and add opacity to the panels
            this.editForm.classList.remove('visually-hidden');
            this.setUpPanel.classList.add('opacity-25', 'pe-none');
            this.workAreasReportPanel.classList.add('opacity-25', 'pe-none');
        } else {
            // If the form is visible, hide it and remove opacity from the panels
            this.editForm.classList.add('visually-hidden');
            this.setUpPanel.classList.remove('opacity-25', 'pe-none');
            this.workAreasReportPanel.classList.remove('opacity-25', 'pe-none');
            // Clear the form values
            document.getElementById('zoneEdit').value = '';
            document.getElementById('subzoneEdit').value = '';
            document.getElementById('workareaEdit').value = '';
        }
    }

    bBoxToTabulatorData(bBoxMeshes) {
        return bBoxMeshes.map(mesh => {
            return {
                MeshId: mesh.uuid,
                Zone: mesh.userData.pds.zone,
                Subzone: mesh.userData.pds.subzone,
                WorkArea: mesh.userData.pds.workArea
            };
        });
    }

    createTabulatorTable(bBoxMeshes) {
        // Create data array
        let data = this.bBoxToTabulatorData(bBoxMeshes);

        // Create Tabulator table
        this.table = new Tabulator(this.reportDiv, {
            index: "MeshId", // Use MeshId as the unique id for each row
            layout: 'fitColumns',
            selectableRows: 1,
            data: data,
            columns: [
                {title: "Zone", field: "Zone"},
                {title: "Subzone", field: "Subzone"},
                {title: "WorkArea", field: "WorkArea"},
            ],
        });

        // Add row selection event listener
        this.table.on("rowSelected", (row) => {
            this.selectedRowData = row.getData();
            this.reportEditButton.disabled = false;
            this.reportDeleteButton.disabled = false;
        });

        // Add row deselection event listener
        this.table.on("rowDeselected", (row) => {
            this.reportEditButton.disabled = true;
            this.reportDeleteButton.disabled = true;
        });
    }

    async createWorkArea() {

        this.extension.viewer.impl.removeOverlayScene('temp-overlay');
        // Turn off the switch
        this.modelSelectionSwitch.checked = false;
        this.createWorkAreaButton.disabled = true;
        this.hideMappedSwitch.disabled = false;
        this.hideWorkAreasSwitch.disabled = false;
        this.assignUserDataToMesh();
        await this.addFilteredDbidsToMesh();
        this.convertTempMeshToPermMesh();
        this.updateMappingDropdown();
        this.hideModelElements(this.extension.tempBboxMesh);
        console.log(this.extension.bBoxMeshes);
    }

    hideModelElements(mesh) {
        let nodes = mesh.userData.filteredDbids;
        let model = mesh.userData.model;

        // Hide the nodes in the model
        this.extension.viewer.hide(nodes, model);
    }

    // Helper method to add a badge
    addBadge(input) {
        const badge = document.createElement('span');
        badge.className = 'badge rounded-pill text-bg-warning position-absolute top-0 end-0 translate-middle-y';
        badge.innerText = '!';
        input.parentNode.appendChild(badge);
    }

    // Helper method to remove a badge
    removeBadge(input) {
        const badge = input.parentNode.querySelector('.position-absolute');
        if (badge) {
            input.parentNode.removeChild(badge);
        }
    }

    assignUserDataToMesh() {
        // Assign the values to the mesh under userData.pds
        this.extension.tempBboxMesh.userData.pds = {
            zone: this.zoneInput.value,
            subzone: this.subzoneInput.value,
            workArea: this.workareaInput.value
        };

        // Write this.workAreaDbIds into tempBboxMesh under userData.dbids
        this.extension.tempBboxMesh.userData.dbids = this.extension.workAreaDbIds;

        // Write this.selectedModel into tempBboxMesh under userData.model
        this.extension.tempBboxMesh.userData.model = this.extension.selectedModel;

        // Get the selected pset and values
        let selectedPset = this.propertyDropdown.value;
        let selectedValues = Array.from(this.valueDropdown.selectedOptions).map(option => option.value);

        // Write to the filter object of this.tempBboxMesh.userData
        this.extension.tempBboxMesh.userData.filter = {};
        this.extension.tempBboxMesh.userData.filter[selectedPset] = selectedValues;

        // Write all values from this.propertyDropdown to userData.mappingOptions
        this.extension.tempBboxMesh.userData.mappingOptions = Array.from(this.propertyDropdown.options).map(option => option.value);
    }

    convertTempMeshToPermMesh() {
        // Add the tempBboxMesh to the bBoxMeshes array
        this.extension.bBoxMeshes.push(this.extension.tempBboxMesh);

        // Get the matrix of the tempBboxMesh
        let matrix = this.extension.tempBboxMesh.matrix;
        let elements = matrix.elements;

        // Change the color of the tempBboxMesh to light green
        this.extension.tempBboxMesh.material.color.set(0x32cd32);

        // Create an edges helper from the tempBboxMesh
        let edges = new THREE.EdgesHelper(this.extension.tempBboxMesh, 0x000000);

        // Add the tempBboxMesh and its edges to the permanent overlay
        this.extension.viewer.impl.addOverlay('perm-overlay', this.extension.tempBboxMesh);
        this.extension.viewer.impl.addOverlay('perm-overlay', edges);
    }

    redrawMeshes() {
        // Clear everything from the permanent overlay
        this.extension.viewer.impl.clearOverlay('perm-overlay');

        // Iterate through the updated bBoxMeshes array
        for (let mesh of this.extension.bBoxMeshes) {
            // Create an edges helper from the mesh
            let edges = new THREE.EdgesHelper(mesh, 0x000000);

            // Add the mesh and its edges to the permanent overlay
            this.extension.viewer.impl.addOverlay('perm-overlay', mesh);
            this.extension.viewer.impl.addOverlay('perm-overlay', edges);
        }
    }

    // Define a function to update the WorkArea Name field
    updateWorkAreaCode() {
        // Check if the inputs are not empty
        if (this.zoneInput.value && this.subzoneInput.value && this.workareaInput.value) {
            this.workAreaCodeInput.value = this.zoneInput.value + '_' + this.subzoneInput.value + '_' + this.workareaInput.value;
        }
        // If any of the inputs are empty, clear this.workAreaCodeInput.value
        else {
            this.workAreaCodeInput.value = '';
        }
    }

    async downloadMapping() {
        
        // await this.addFilteredDbidsToMesh();

        let csvData = [];
        let mappingOptions = Array.from(this.mappingDropdown.options)
            .filter(option => option.selected && !option.disabled)
            .map(option => option.value);

        for (let mesh of this.extension.bBoxMeshes) {
            let { model, filteredDbids, filter, pds } = mesh.userData;

            for (let option of mappingOptions) {
                let [categoryFilter, propFilter] = option.split('/');
                let options = {
                    propFilter: [propFilter],
                    categoryFilter: [categoryFilter],
                    ignoreHidden: true,
                    needsExternalId: false
                };

                await new Promise((resolve, reject) => {
                    model.getBulkProperties2(filteredDbids, options, 
                        properties => {
                            properties.forEach(property => {
                                let row = csvData.find(row => row.Dbid === property.dbId);
                                if (!row) {
                                    row = {
                                        Zone: pds.zone,
                                        Subzone: pds.subzone,
                                        WorkArea: pds.workArea,
                                        Dbid: property.dbId
                                    };
                                    csvData.push(row);
                                }

                                if (property.properties.length > 0) {
                                    row[option] = property.properties[0].displayValue;
                                } else {
                                    row[option] = '';
                                }
                            });
                            resolve();
                        },
                        error => {
                            console.error(`Failed to get properties for dbids:`, error);
                            reject(error);
                        }
                    );
                });
            }
        }

        // Convert the csvData array to CSV format
        let csvContent = "Zone,Subzone,WorkArea,Dbid," + mappingOptions.join(',') + "\n" + csvData.map(row => Object.values(row).join(',')).join("\n");

        // Download the CSV file
        this.downloadCsv(csvContent, 'mapping.csv');
    }

    // Download CSV data as a file
    downloadCsv(data, filename) {
        const blob = new Blob([data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', filename);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    addFilteredDbidsToMesh() {
        let mesh = this.extension.tempBboxMesh;
        let { model, dbids, filter } = mesh.userData;
        let keys = Object.keys(filter);
        let filterValues = Object.values(filter).flat();
        let categoryFilter = keys.map(key => key.split('/')[0]);
        let propFilter = keys.map(key => key.split('/')[1]);
        let options = {
            propFilter: propFilter,
            categoryFilter: categoryFilter,
            ignoreHidden: true,
            needsExternalId: false
        };

        return new Promise((resolve, reject) => {
            model.getBulkProperties2(dbids, options, 
                properties => {
                    let filteredDbids = properties.filter(item => filterValues.includes(item.properties[0].displayValue)).map(item => item.dbId);
                    mesh.userData.filteredDbids = filteredDbids;
                    resolve();
                },
                error => {
                    console.error(`Failed to get properties for dbids:`, error);
                    reject(error);
                }
            );
        });
    }

    updateMappingDropdown() {
        // Initialize an empty array to store the intersection
        let intersection = [];

        // Iterate over this.extension.bBoxMeshes
        this.extension.bBoxMeshes.forEach((mesh, index) => {
            // For the first mesh, assign its mappingOptions to intersection
            if (index === 0) {
                intersection = mesh.userData.mappingOptions;
            } else {
                // For subsequent meshes, find the intersection of userData.mappingOptions and intersection
                intersection = intersection.filter(value => mesh.userData.mappingOptions.includes(value));
            }
        });

        // Clear the mappingDropdown
        this.mappingDropdown.innerHTML = '';

        // Populate the mappingDropdown with the intersection options
        intersection.forEach(value => {
            let option = document.createElement('option');
            option.value = value;
            option.text = value;
            this.mappingDropdown.add(option);
        });
    }

    createIfc() {

        // New code to store the parameters of each mesh in this.extension.bBoxMeshes
        this.paramsArray = [];
        this.extension.bBoxMeshes.forEach((mesh, index) => {
            let meshParams = mesh.geometry.parameters;
            let matrix = mesh.matrix;
            let elements = matrix.elements;

            // Calculate the offset from the center to the bottom left corner
            let offsetX = meshParams.width / 2;
            let offsetY = meshParams.height / 2;
            let offsetZ = meshParams.depth / 2;

            // Adjust the translation component to account for the offset
            let x = elements[12] - offsetX;
            let y = elements[13] - offsetY;
            let z = elements[14] - offsetZ;

            let matrixList = [
                [elements[0], elements[1], elements[2], elements[3]],
                [elements[4], elements[5], elements[6], elements[7]],
                [elements[8], elements[9], elements[10], elements[11]],
                [x, y, z, elements[15]]
            ];

            this.paramsArray.push({
                width: meshParams.width,
                height: meshParams.height,
                depth: meshParams.depth,
                matrix: matrixList,
                zone: mesh.userData.pds.zone, // Add this line
                subzone: mesh.userData.pds.subzone, // Add this line
                workArea: mesh.userData.pds.workArea // Add this line
            });
        });

        // Pass this.paramsArray to runPythonScript
        this.extension.runPythonScript(this.paramsArray);
    }
}