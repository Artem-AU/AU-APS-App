export class WorkAreaPanel extends Autodesk.Viewing.UI.DockingPanel {
    constructor(extension, id, title, options) {
        super(extension.viewer.container, id, title, options);
        this.extension = extension;
        this.container.style.right = (options.x || 0) + 'px';
        this.container.style.top = (options.y || 0) + 'px';
        this.container.style.width = (options.width || 400) + 'px';
        this.container.style.height = (options.height || 800) + 'px';
    }

    initialize() {
        this.title = this.createTitleBar(this.titleLabel || this.container.id);
        this.initializeMoveHandlers(this.title);
        this.container.appendChild(this.title);
        this.closer = this.createCloseButton();
        this.initializeCloseHandler(this.closer);
        this.container.appendChild(this.closer);

        // Fetch the HTML file
        fetch("/extensions/WorkAreaExtension/WorkAreaPanel.html")
            .then(response => response.text())
            .then(data => {
                // Create a new div element
                const newDiv = document.createElement("div");
                // Set its innerHTML to the fetched HTML
                newDiv.style.width = "100%";
                newDiv.style.height = `calc(100% - 50px)`;
                newDiv.innerHTML = data;
                // Append the new div to the container
                this.container.appendChild(newDiv);

                // Get UI elements
                this.zoneInput = document.getElementById('zone');
                this.subzoneInput = document.getElementById('subzone');
                this.workareaInput = document.getElementById('workarea');
                this.modelSelectionSwitch = document.getElementById('modelSelectionSwitch');
                this.hideMappedButton = document.getElementById('hideMappedButton');
                this.propertyDropdown = document.getElementById('propertyDropdown');
                this.valueDropdown = document.getElementById('valueDropdown');
                this.createWorkAreaButton = document.getElementById('createWorkAreaButton');
                this.workAreaCodeInput = document.querySelector('#workarea_div .form-control');
                this.mappingDropdown = document.getElementById('mappingDropdown');
                this.downloadMappingButton = document.querySelector('#mapping_div .btn');
                this.createIfcButton = document.querySelector('#ifc_div .btn');

                // Initialize tooltip for modelSelectionSwitch
                const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
                const tooltipList = Array.from(tooltipTriggerList).map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl, {
                    delay: {
                        show: 500,
                        // hide: 0
                    }
                }));

            
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
                            // Perform an action
                            this.updateWorkAreaCode();
                            console.log('All fields are filled');
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
                this.hideMappedButton.addEventListener('click', () => {
                    for (let mesh of this.extension.bBoxMeshes) {
                        this.hideModelElements(mesh);
                    }
                    console.log('Hide Mapped Elements button clicked!');
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
                    // Do some stuff here
                    await this.createWorkArea();
                    this.propertyDropdown.innerHTML = '';
                    this.valueDropdown.innerHTML = '';
                    this.workareaInput.value = '';
                    this.downloadMappingButton.disabled = false;
                    this.updateWorkAreaCode();
                    this.createIfcButton.disabled = false;
                    console.log('Button clicked!');
                });

                // Add an event listener for the click event
                this.downloadMappingButton.addEventListener('click', () => {
                    // Do some stuff here
                    this.downloadMapping();
                    console.log('Download button clicked!');
                });

                // Add an event listener for the click event
                this.createIfcButton.addEventListener('click', () => {
                    // Do some stuff here
                    this.createIfc();
                    console.log('IFC Download button clicked!');
                });

            })
            .catch((error) => {
                console.error('Error:', error);
            });
    }

    // toggleButtonClass(button) {
    //     if (button.classList.contains('btn-primary')) {
    //         button.classList.remove('btn-primary');
    //         button.classList.add('btn-secondary');
    //         button.disabled = true;
    //     } else if (button.classList.contains('btn-secondary')) {
    //         button.classList.remove('btn-secondary');
    //         button.classList.add('btn-primary');
    //         button.disabled = false;
    //     }
    // }

    async createWorkArea() {

        this.extension.viewer.impl.removeOverlayScene('temp-overlay');
        // Turn off the switch
        this.modelSelectionSwitch.checked = false;
        this.createWorkAreaButton.disabled = true;
        this.hideMappedButton.disabled = false;
        this.assignUserDataToMesh();

        await this.addFilteredDbidsToMesh();

        
        this.updateMappingDropdown();

        console.log("this.tempBboxMesh", this.extension.tempBboxMesh)

        this.convertTempMeshToPermMesh();
        this.hideModelElements(this.extension.tempBboxMesh);



        // // Change the button class to 'btn-secondary'
        // this.createWorkAreaButton.classList.remove('btn-primary');
        // this.createWorkAreaButton.classList.add('btn-secondary');
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
        badge.className = 'badge rounded-pill text-bg-warning position-absolute top-0 start-100 translate-middle';
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

        console.log("this.extension.workAreaDbIds", this.extension.workAreaDbIds)

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
    }

    convertTempMeshToPermMesh() {
        // Add the tempBboxMesh to the bBoxMeshes array
        this.extension.bBoxMeshes.push(this.extension.tempBboxMesh);
        console.log("this.bBoxMeshes", this.extension.bBoxMeshes)   

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

    // addFilteredDbidsToMesh() {
    //     let promises = this.extension.bBoxMeshes.map(mesh => {
    //         let { model, dbids, filter } = mesh.userData;
    //         let keys = Object.keys(filter);
    //         let filterValues = Object.values(filter).flat();
    //         let categoryFilter = keys.map(key => key.split('/')[0]);
    //         let propFilter = keys.map(key => key.split('/')[1]);
    //         let options = {
    //             propFilter: propFilter,
    //             categoryFilter: categoryFilter,
    //             ignoreHidden: true,
    //             needsExternalId: false
    //         };

    //         return new Promise((resolve, reject) => {
    //             model.getBulkProperties2(dbids, options, 
    //                 properties => {
    //                     let filteredDbids = properties.filter(item => filterValues.includes(item.properties[0].displayValue)).map(item => item.dbId);
    //                     mesh.userData.filteredDbids = filteredDbids;
    //                     resolve();
    //                 },
    //                 error => {
    //                     console.error(`Failed to get properties for dbids:`, error);
    //                     reject(error);
    //                 }
    //             );
    //         });
    //     });

    //     return Promise.all(promises);
    // }

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
        // Get the options of the mappingDropdown and propertyDropdown elements
        let mappingOptions = Array.from(this.mappingDropdown.options).filter(option => !option.disabled).map(option => option.value);
        let propertyOptions = Array.from(this.propertyDropdown.options).map(option => option.value);
        console.log("mappingOptions.length", mappingOptions.length)
        console.log("propertyOptions.length", propertyOptions.length)

        // Check if mappingDropdown has any options
        if (mappingOptions.length === 0) {
            // If no, populate all the options from propertyDropdown
            propertyOptions.forEach(value => {
                let option = document.createElement('option');
                option.value = value;
                option.text = value;
                this.mappingDropdown.add(option);
            });
        } else {
            // If yes, find the intersection of mappingOptions and propertyOptions
            let intersection = mappingOptions.filter(value => propertyOptions.includes(value));
            console.log("intersection.length", intersection.length)
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