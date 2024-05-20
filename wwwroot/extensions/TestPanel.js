export class TestPanel extends Autodesk.Viewing.UI.DockingPanel {
    constructor(extension, id, title, options) {
        super(extension.viewer.container, id, title, options);
        this.extension = extension;
        this.container.style.right = (options.x || 0) + 'px';
        this.container.style.top = (options.y || 0) + 'px';
        this.container.style.width = (options.width || 400) + 'px';
        this.container.style.height = (options.height || 800) + 'px';
    }

    initialize() {
        this.initializeTitleAndCloser();
        this.initializeDashboard();
        this.initializePropertyDiv();
        this.initializeWorkAreaDiv();
        this.initializeMappingDiv(); // Add this line
        this.initializeIfcDiv();
        this.container.appendChild(this.dashboard);
    }

    initializeTitleAndCloser() {
        this.title = this.createTitleBar(this.titleLabel || this.container.id);
        this.closer = this.createCloseButton(); 
        this.initializeCloseHandler(this.closer);
        this.initializeMoveHandlers(this.title);
        this.container.appendChild(this.title);
        this.container.appendChild(this.closer);
    }

    initializeDashboard() {
        this.dashboard = document.createElement('div');
        let titleHeight = this.title.offsetHeight;
        this.dashboard.style.height = `calc(100% - ${titleHeight}px)`;
        this.dashboard.style.width = '100%';
        this.dashboard.style.backgroundColor = 'white';
        this.dashboard.style.display = 'flex';
        this.dashboard.style.flexDirection = 'column';
    }

    initializePropertyDiv() {
        this.propertyDiv = this.createDivWithLabel('propertyDiv', 'Define Property:');
        this.propertyDiv.appendChild(this.createInputLine('Property Set:', 'propertySetInput'));
        this.propertyDiv.appendChild(this.createInputLine('Zone:', 'zoneInput'));
        this.propertyDiv.appendChild(this.createInputLine('Subzone:', 'subzoneInput'));
        this.propertyDiv.appendChild(this.createInputLine('WorkArea:', 'workAreaInput'));
        this.dashboard.appendChild(this.propertyDiv);
    }

    initializeWorkAreaDiv() {
        this.workAreaDiv = this.createDivWithLabel('workAreaDiv', 'Add Workarea:');
        let workAreaButtons = this.createButtonDiv('workAreaButtons');
        this.selectObjectsButton = this.createButton('selectObjectsButton', 'Model Selection: OFF', 'lightgrey', () => {
            // Toggle the 'on' class and change the background color
            if (this.selectObjectsButton.classList.contains('on')) {
                this.turnOffSelectObjectsButton();
            } else {
                this.selectObjectsButton.classList.add('on');
                this.selectObjectsButton.style.backgroundColor = 'lightgreen'; // Changed to green
                this.selectObjectsButton.textContent = 'Model Selection: ON';
            }
        });

        // Append the selectObjectsButton to the workAreaButtons div
        workAreaButtons.appendChild(this.selectObjectsButton);

        // Create the createWorkareaButton with a click listener that removes the overlay scene
        let createWorkareaButton = this.createButton('createWorkareaButton', 'Create Workarea', 'lightgrey', () => {
            this.extension.viewer.impl.removeOverlayScene('temp-overlay');

            // Retrieve the values
            let zone = document.getElementById('zoneInput').value;
            let subzone = document.getElementById('subzoneInput').value;
            let workArea = document.getElementById('workAreaInput').value;

            // Assign the values to the mesh
            this.extension.tempBboxMesh.zone = zone;
            this.extension.tempBboxMesh.subzone = subzone;
            this.extension.tempBboxMesh.workArea = workArea;


            this.extension.bBoxMeshes.push(this.extension.tempBboxMesh);
            // console.log('--- TestPanel.js createWorkareaButton tempBboxMesh:', this.extension.tempBboxMesh);

            // // Assuming `mesh` is your mesh object
            // var box = new THREE.Box3().setFromObject(this.extension.tempBboxMesh);

            // // Create a new Vector3 object with arbitrary x, y, z coordinates
            // var point = new THREE.Vector3(10, 20, 30);

            // // Now you can use this point with the `containsPoint` method
            // var isInside = box.containsPoint(point);

            // console.log("is indide", isInside);  // Will log `true` if the point is inside the box, `false` otherwise

            let matrix = this.extension.tempBboxMesh.matrix;
            let elements = matrix.elements;
            let matrixList = [
                [elements[0], elements[1], elements[2], elements[3]],
                [elements[4], elements[5], elements[6], elements[7]],
                [elements[8], elements[9], elements[10], elements[11]],
                [elements[12], elements[13], elements[14], elements[15]]
            ];
            // console.log('--- TestPanel.js createWorkareaButton matrix:', matrixList);

            // Change the color of the tempBboxMesh to light green
            this.extension.tempBboxMesh.material.color.set(0x32cd32);

            // Create an edges helper from the tempBboxMesh
            let edges = new THREE.EdgesHelper(this.extension.tempBboxMesh, 0x000000);

            // Add the tempBboxMesh and its edges to the permanent overlay
            this.extension.viewer.impl.addOverlay('perm-overlay', this.extension.tempBboxMesh);
            this.extension.viewer.impl.addOverlay('perm-overlay', edges);

            // console.log('--- TestPanel.js createWorkareaButton bBoxMeshes:', this.extension.bBoxMeshes);
            this.turnOffSelectObjectsButton();
        });

        workAreaButtons.appendChild(createWorkareaButton);

        this.workAreaDiv.appendChild(workAreaButtons);
        this.dashboard.appendChild(this.workAreaDiv);
    }

    turnOffSelectObjectsButton() {
        this.selectObjectsButton.classList.remove('on');
        this.selectObjectsButton.style.backgroundColor = 'lightgrey';
        this.selectObjectsButton.textContent = 'Model Selection: OFF';
    }

    // initializeMappingDiv() {
    //     this.mappingDiv = this.createDivWithLabel('mappingDiv', 'Create Mapping:');
    //     this.downloadMappingButton = this.createButton('downloadMappingButton', 'Download', 'lightgreen', () => {
    //         // Add your functionality here
    //         // Access targetNodesMap
    //         const targetNodesMap = this.extension.targetNodesMap;
    //         console.log('--- TestPanel.js downloadMappingButton this.targetNodesMap:', targetNodesMap);

    //         function getCOG(viewer, dbId) {
    //             const instanceTree = viewer.model.getInstanceTree();
    //             const bbox = new THREE.Box3();

    //             instanceTree.enumNodeFragments(dbId, function (fragId) {
    //                 viewer.model.getFragmentList().getWorldBounds(fragId, bbox);
    //             }, true);

    //             const center = bbox.getCenter(new THREE.Vector3());
    //             return center;
    //         }

    //         // Iterate over the values of targetNodesMap
    //         for (const targetNodes of targetNodesMap.values()) {
    //             // Iterate over the items in each value
    //             for (const dbId of targetNodes) {
    //                 const cog = getCOG(this.extension.viewer, dbId);
    //                 console.log("cog", cog);  // Logs the COG of the model element with the given dbId
    //             }
    //         }
    //     });
    //     this.mappingDiv.appendChild(this.downloadMappingButton);
    //     this.dashboard.appendChild(this.mappingDiv);
    // }

    initializeMappingDiv() {
        this.mappingDiv = this.createDivWithLabel('mappingDiv', 'Create Mapping:');
        this.downloadMappingButton = this.createButton('downloadMappingButton', 'Download', 'lightgreen', async () => {
            // Add your functionality here
            // Access targetNodesMap
            const targetNodesMap = this.extension.targetNodesMap;
            // console.log('--- TestPanel.js downloadMappingButton this.targetNodesMap:', targetNodesMap);

            function getCOG(viewer, dbId) {
                const instanceTree = viewer.model.getInstanceTree();
                let fragIds = [];

                instanceTree.enumNodeFragments(dbId, function (fragId) {
                    fragIds.push(fragId);
                }, true);

                let options = {
                    quantil: 1,
                    allowlist: fragIds
                };

                let fuzzyBox = viewer.model.getFuzzyBox(options);

                // Get the center of the bounding box
                let center = fuzzyBox.getCenter(new THREE.Vector3());

                return center;
            }

            // Convert object to CSV data
            function objectToCsv(data) {
                const csvRows = [];
                // Add headers
                csvRows.push("WorkArea,Identity Data/PDS_Code");
                for (const key in data) {
                    const values = data[key];
                    for (const value of values) {
                        csvRows.push(`${key},${value}`);
                    }
                }
                return csvRows.join("\n");
            }

            // Download CSV data as a file
            function downloadCsv(data, filename) {
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

            // Create an empty object to store the dbIds and their COGs
            const dbIdToCOG = {};

            // Iterate over the values of targetNodesMap
            for (const targetNodes of targetNodesMap.values()) {
                // Iterate over the items in each value
                for (const dbId of targetNodes) {
                    const cog = getCOG(this.extension.viewer, dbId);
                    // console.log("cog", cog);  // Logs the COG of the model element with the given dbId

                    // Add the dbId and its COG to the object
                    dbIdToCOG[dbId] = cog;

                    // // Create a red sphere at the COG
                    // const sphereGeometry = new THREE.SphereGeometry(1, 32, 32);
                    // const sphereMaterial = new THREE.MeshBasicMaterial({color: 0xff0000});
                    // const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
                    // sphere.position.copy(cog);

                    // // Add the sphere to the overlay
                    // this.extension.viewer.impl.addOverlay('perm-overlay', sphere);
                }
            }

            // Log the object
            // console.log("dbIdToCOG", dbIdToCOG);

            // Create an empty object to store the workAreas and their dbIds
            const workAreaToDbIds = {};

            // Iterate over the bBoxMeshes
            for (const bBoxMesh of this.extension.bBoxMeshes) {
                // Create a bounding box from the mesh object
                const box = new THREE.Box3().setFromObject(bBoxMesh);

                // Iterate over the entries of dbIdToCOG
                for (const [dbId, cog] of Object.entries(dbIdToCOG)) {
                    // Check if the COG is contained within the box
                    if (box.containsPoint(cog)) {
                        // If the workArea does not exist in the object, add it with an empty array
                        if (!workAreaToDbIds[bBoxMesh.workArea]) {
                            workAreaToDbIds[bBoxMesh.workArea] = [];
                        }

                        // Add the dbId to the array under the corresponding workArea
                        workAreaToDbIds[bBoxMesh.workArea].push(dbId);

                        // // Create a red sphere at the COG
                        // const sphereGeometry = new THREE.SphereGeometry(1, 32, 32);
                        // const sphereMaterial = new THREE.MeshBasicMaterial({color: 0xff0000});
                        // const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
                        // sphere.position.copy(cog);

                        // // Add the sphere to the overlay
                        // this.extension.viewer.impl.addOverlay('perm-overlay', sphere);
                    }
                }
            }

            // // Log the object
            // console.log("workAreaToDbIds", workAreaToDbIds);

            // Create an empty object to store the workAreas and their GUIDs
            const workAreaToGuids = {};

            // Create an array to store the promises
            const promises = [];

            // Iterate over the entries of workAreaToDbIds
            for (const [workArea, dbIds] of Object.entries(workAreaToDbIds)) {
                // Create a new promise
                const promise = new Promise((resolve) => {
                    // Get the properties for the dbIds
                    this.extension.viewer.model.getBulkProperties2(dbIds, { categoryFilter: ['Identity Data'], propFilter: ['PDS_Code'] }, function (properties) {
                        // console.log("properties", properties);
                        // Iterate over the properties
                        for (const property of properties) {
                            // Get the PDS_Code from the properties
                            const guid = property.properties.find(prop => prop.displayName === 'PDS_Code').displayValue;

                            // If the workArea does not exist in the object, add it with an empty array
                            if (!workAreaToGuids[workArea]) {
                                workAreaToGuids[workArea] = [];
                            }

                            // Add the PDS_Code to the array under the corresponding workArea
                            workAreaToGuids[workArea].push(guid);
                        }

                        // Resolve the promise
                        resolve();
                    });
                });

                // Add the promise to the array
                promises.push(promise);
            }

            // Wait for all the promises to resolve
            Promise.all(promises).then(() => {
                // Convert workAreaToGuids to CSV and download it
                const csvData = objectToCsv(workAreaToGuids);
                downloadCsv(csvData, 'workAreaToGuids.csv');
            });

            // console.log("workAreaToGuids", workAreaToGuids);


        });
        this.mappingDiv.appendChild(this.downloadMappingButton);
        this.dashboard.appendChild(this.mappingDiv);
    }

    initializeIfcDiv() {
        this.ifcDiv = this.createDivWithLabel('ifcDiv', 'Create IFC:');
        this.downloadButton = this.createButton('downloadButton', 'Download', 'lightgreen', () => {
            let params = this.extension.tempBboxMesh.geometry.parameters;
            // console.log('--- TestPanel.js downloadButton params:', params.width, params.depth, params.height);
            // this.extension.runPythonScript(params.width, params.depth, params.height);

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
                    zone: mesh.zone, // Add this line
                    subzone: mesh.subzone, // Add this line
                    workArea: mesh.workArea // Add this line
                });

                // console.log('width: ', meshParams.width);
                // console.log('height: ', meshParams.height);
                // console.log('depth: ', meshParams.depth);
                // console.log('matrix: ', matrixList);
            });

            // console.log('--- TestPanel.js downloadButton meshParams:', this.paramsArray);

            // Pass this.paramsArray to runPythonScript
            this.extension.runPythonScript(this.paramsArray);

        });
        this.ifcDiv.appendChild(this.downloadButton);
        this.dashboard.appendChild(this.ifcDiv);
    }

    createDivWithLabel(id, labelText) {
        let div = document.createElement('div');
        div.id = id;
        div.style.display = 'flex';
        div.style.flexDirection = 'column';
        div.style.marginTop = '50px';
        let label = document.createElement('span');
        label.textContent = labelText;
        label.style.color = 'black';
        label.style.fontWeight = 'bold';
        label.style.fontSize = '18px';
        label.style.marginLeft = '10px';
        label.style.marginTop = '10px';
        label.style.textDecoration = 'underline'; // Add underline to the label
        div.appendChild(label);
        return div;
    }

    createInputLine(labelText, inputId) {
        let line = document.createElement('div');
        line.style.display = 'flex'; // Set display to flex
        line.style.justifyContent = 'space-between'; // Distribute space between items
        line.style.marginTop = '10px'; // Add top margin

        let label = document.createElement('label');
        label.textContent = labelText;
        label.style.color = 'black';
        label.style.flexBasis = '30%'; // Allocate 30% of the space to the label

        let input = document.createElement('input');
        input.id = inputId; // Assign the ID to the input field
        input.style.flexBasis = '70%'; // Allocate 70% of the space to the input
        input.style.marginRight = '10px'; // Add right margin
        input.type = 'text';

        line.appendChild(label);
        line.appendChild(input);
        return line;
    }

    createButtonDiv(id) {
        let div = document.createElement('div');
        div.id = id;
        div.style.display = 'flex';
        div.style.flexDirection = 'row';
        div.style.justifyContent = 'space-evenly';
        return div;
    }

    createButton(id, text, color, clickHandler) {
        let button = document.createElement('button');
        button.id = id;
        button.textContent = text;
        button.style.fontFamily = 'Artifakt Element, sans-serif';
        button.style.color = 'black';
        button.style.backgroundColor = color; // Use the color argument
        button.style.cursor = 'pointer';
        button.style.borderRadius = '5px';
        button.style.textAlign = 'center';
        button.style.lineHeight = '2';
        button.style.boxSizing = 'border-box'; // Include padding and border in element's width
        button.style.margin = '10px'; // Center the button within its parent
        button.style.border = '2px solid grey';
        button.style.borderRadius = '5px';
        button.style.textAlign = 'center';

        // If a clickHandler is provided, add it as an event listener
        if (clickHandler) {
            button.addEventListener('click', clickHandler);
        }

        return button;
    }
}