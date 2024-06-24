import { BaseExtension } from '../BaseExtension.js';
import { SearchSetsPanel } from './SearchSetsPanel.js';


class SearchSetsExtension extends BaseExtension {
    constructor(viewer, options) {
        super(viewer, options);
        this._button = null;
        this._panel = null;
        this.bBoxMeshes = [];
    }

    async load() {
        await super.load();
        
        await Promise.all([
            this.loadScript('https://unpkg.com/tabulator-tables@6.2.1/dist/js/tabulator.min.js', 'Tabulator'),
            this.loadStylesheet('https://unpkg.com/tabulator-tables@6.2.1/dist/css/tabulator.min.css'),
        ]);

        console.log('SearchSetsExtension loaded.');

        // Create a permanent overlay
        this.viewer.impl.createOverlayScene('perm-overlay');
        return true;
    }

    unload() {
        super.unload();
        for (const button of [this._button]) {
            this.removeToolbarButton(button);
        }
        this._button = null;
        for (const panel of [this._panel]) {
            panel.setVisible(false);
            panel.uninitialize();
        }
        this._panel = null;
        console.log('SearchSetsExtension unloaded.');

        // Clear the permanent overlay
        this.viewer.impl.clearOverlay('perm-overlay');
        
        return true;
    }

    onToolbarCreated() {
        this._panel = new SearchSetsPanel(this, 'searchsets-panel', 'Search Sets Panel', { x: 10, y: 50 });

        this._button = this.createToolbarButton('searchsets-button', 'https://cdn0.iconfinder.com/data/icons/lightly-icons/30/link-480.png', 'SearchSets', 'lightsalmon');
        this._button.onClick = async () => {
            this._panel.setVisible(!this._panel.isVisible());
            this._button.setState(this._panel.isVisible() ? Autodesk.Viewing.UI.Button.State.ACTIVE : Autodesk.Viewing.UI.Button.State.INACTIVE);
            // if (this._panel.isVisible()) {

            // }
        };
    }

    async onModelLoaded(model) {
        await super.onModelLoaded(model);
        
        this.dbIdToCOG = this.createDbIdToCOG();

        // this._panel.setVisible(true);

        // this.createBoxesFromLevels(model.myData.bbox, this.viewer.getExtension('Autodesk.AEC.LevelsExtension'))
    }

    async onModelUnloaded(model) {
        super.onModelUnloaded(model);
    }

    async onSelectionChanged(model, dbids) {
        super.onSelectionChanged(model, dbids);
        const aggregateSelection = this.viewer.getAggregateSelection();

        if (aggregateSelection.length > 0 && this._panel.linkSubtaskSwitch.is(':checked')) {
            const model = aggregateSelection[0].model;
            const dbIds = aggregateSelection[0].selection;

            this.tempSubTasks = this.generateTempSubTasks(dbIds);
            const selectionGuids = await this.fetchSelectionGuids(model, dbIds);
            this.tempLinks = this.generateTempLinks(dbIds, this.tempSubTasks, selectionGuids);

            this._panel.createTabulatorTableForTempSubTasks(this.tempSubTasks);
            this._panel.createTabulatorTableForTempLinks(this.tempLinks);
            // this._panel.addSubTasksButton.prop('disabled', false);
        }
    }   

    onShowAll(ev) {
        // Handle show all event
        if (this.bBoxMeshes && this.bBoxMeshes.length > 0) {
            this._panel.hideMappedSwitch.checked = false;
        }
    }

    generateTempSubTasks(dbIds) {
        const DateTime = luxon.DateTime;
        const dateFormat = "d/MM/yyyy h:mm a";

        // Calculate parentStart, parentFinish, and subtaskDuration
        const parentStart = DateTime.fromFormat(this._panel.selectedTaskStart, dateFormat);
        const parentFinish = DateTime.fromFormat(this._panel.selectedTaskFinish, dateFormat);
        const totalDuration = parentFinish - parentStart;
        const subtaskDuration = totalDuration / dbIds.length;

        const tempSubTasks = [];
        const tempTaskIds = [];
        let newTaskId = 1;
        let index = 1;

        for (const dbid of dbIds) {
            let parentTaskId, tempTaskName, tempTaskStart, tempTaskFinish, formattedStart, formattedFinish; // Declare variables outside the if-else block
            if (this._panel.newTaskType === "sub") {
                parentTaskId = this._panel.selectedTaskId.toString();
                tempTaskName = `${this._panel.selectedTaskName}_${this._panel.behaviourType}_SubTask_${index}`;
                tempTaskStart = new Date(parentStart.toJSDate().getTime() + subtaskDuration * (index - 1));
                tempTaskFinish = new Date(tempTaskStart.getTime() + subtaskDuration);
                formattedStart = DateTime.fromJSDate(tempTaskStart).toFormat(dateFormat);
                formattedFinish = DateTime.fromJSDate(tempTaskFinish).toFormat(dateFormat);
            } else {
                parentTaskId = "-1";
                tempTaskName = this._panel.taskNameInput.val();
                tempTaskStart = this._panel.taskStartInput.val();
                tempTaskFinish = this._panel.taskFinishInput.val();
                formattedStart = DateTime.fromISO(tempTaskStart).toFormat(dateFormat);
                formattedFinish = DateTime.fromISO(tempTaskFinish).toFormat(dateFormat);
            }

            console.log("check tempTaskName:", tempTaskName);
            console.log("check tempTaskStart:", tempTaskStart);
            console.log("check tempTaskFinish:", tempTaskFinish);

            for (let i = 1; i <= this._panel.maxTaskId + 1; i++) {
                if (!this._panel.taskIds.includes(i) && !tempTaskIds.includes(i)) {
                    newTaskId = i;
                    tempTaskIds.push(newTaskId);
                    break;
                }
            }



            console.log("check formattedStart:", formattedStart);
            console.log("check formattedFinish:", formattedFinish);

            let newTask = this.createTempSubTask("Create", parentTaskId, newTaskId.toString(), "", "True", tempTaskName, formattedStart, formattedFinish);
            tempSubTasks.push(newTask);

            index++;
        }

        return tempSubTasks;
    }

    // Step 1: Extract the logic into a new function
    async fetchSelectionGuids(model, dbIds) {
        const selectionGuids = new Map();
        const options = {
            categoryFilter: ["Item"],
            propFilter: ["GUID"],
            ignoreHidden: true, // Assuming you want to ignore hidden properties
            needsExternalId: false // Set to true only if you need externalIds
        };

        await new Promise((resolve, reject) => {
            const onSuccessCallback = (data) => {
                data.forEach((item) => {
                    if (item.properties) {
                        item.properties.forEach((prop) => {
                            if (prop.displayName === "GUID") {
                                selectionGuids.set(item.dbId, prop.displayValue);
                            }
                        });
                    }
                });
                resolve();
            };

            const onErrorCallback = (error) => {
                console.error("Error fetching properties:", error);
                reject(error);
            };

            model.getBulkProperties2(dbIds, options, onSuccessCallback, onErrorCallback);
        });

        return selectionGuids;
    }

    generateTempLinks(dbIds, tempSubTasks, selectionGuids) {
        const tempLinks = [];

        tempSubTasks.forEach((task, idx) => {
            const dbid = dbIds[idx];
            const guidValue = selectionGuids.get(dbid) || "000"; // Default GUID if not found

            let newLink = this.createTempLink("Create", task.TaskId.toString(), task.Name, "", this._panel.modelNameInput.val(), this._panel.behaviourType, "Or", "AllOfThese", "Item.GUID", "Equals", guidValue);
            tempLinks.push(newLink);
        });

        return tempLinks;
    }

    // Step 2: Define the Structure for a Task Object
    // This function creates a new task object based on the provided parameters
    createTempSubTask(actionName, parentTaskId, taskId, taskCode, isCreatedTask, name, startDateTime, finishDateTime) {
        return {
            ActionName: actionName,
            ParentTaskId: parentTaskId,
            TaskId: taskId,
            TaskCode: taskCode,
            IsCreatedTask: isCreatedTask,
            Name: name,
            StartDateTime: startDateTime,
            FinishDateTime: finishDateTime
        };
    }   

    createTempLink(actionName, taskId, taskName, taskCode, modelName, behaviourType, anyOfTheseMode, searchSetGroup, propertyName, operator, propertyValue) {
        return {
            ActionName: actionName,
            TaskId: taskId,
            TaskName: taskName,
            TaskCode: taskCode,
            ModelName: modelName,
            BehaviourType: behaviourType,
            AnyOfTheseMode: anyOfTheseMode,
            SearchSetGroup: searchSetGroup,
            PropertyName: propertyName,
            Operator: operator,
            PropertyValue: propertyValue
        };
    }

    createBboxFromFragments() {
        let modelToFragIdsMap = this.getFragmentsForSelection();
        modelToFragIdsMap.forEach((fragIds, model) => {
            let options = {
                quantil: 1,
                allowlist: fragIds
            };

            let fuzzyBox = model.getFuzzyBox(options);

            // Get the size of the bounding box
            let size = fuzzyBox.getSize(new THREE.Vector3());

            // Get the center of the bounding box
            let center = fuzzyBox.getCenter(new THREE.Vector3());

            // Create a semi-transparent material
            let material = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.3 });

            // Create a BoxGeometry with the size of the original box
            let geometry = new THREE.BoxGeometry(size.x, size.y, size.z);

            // Create a mesh with the geometry and material
            this.tempBboxMesh = new THREE.Mesh(geometry, material);

            // Position the mesh at the center of the original box
            this.tempBboxMesh.position.copy(center);

            // Create an edges helper from the mesh
            let edges = new THREE.EdgesHelper(this.tempBboxMesh, 0x000000);

            this.viewer.impl.createOverlayScene('temp-overlay');

            // Add the mesh and edges to the overlay
            this.viewer.impl.addOverlay('temp-overlay', this.tempBboxMesh);
            this.viewer.impl.addOverlay('temp-overlay', edges);
        });
    }

    // createBoxesFromLevels(bbox, levelsExtension) {
    //     let boxes = [];

    //     // Get the min and max x, y values from the bounding box
    //     let min = bbox.min;
    //     let max = bbox.max;

    //     // Create an overlay scene
    //     this.viewer.impl.createOverlayScene('levels-overlay');

    //     // Get the levels
    //     let levels = levelsExtension.aecModelData.levels;

    //     // Iterate over all levels
    //     for (let levelIndex = 0; levelIndex < levels.length; levelIndex++) {
    //         // Get the current level
    //         let currentLevel = levels[levelIndex];

    //         // Use the min z value from the bounding box for the first level, and the elevation of the current level for the other levels
    //         let minZ = levelIndex === 0 ? min.z : currentLevel.elevation;

    //         // Use the elevation of the next level (or the max z value from the bounding box if there is no next level) as the max z value
    //         let maxZ = levelIndex < levels.length - 1 ? levels[levelIndex + 1].elevation : max.z;

    //         // Create a BoxGeometry with the min and max x, y, z values
    //         let geometry = new THREE.BoxGeometry(max.x - min.x, max.y - min.y, maxZ - minZ);

    //         // Create a semi-transparent material
    //         let material = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.3 });

    //         // Create a mesh with the geometry and material
    //         let box = new THREE.Mesh(geometry, material);

    //         // Position the box at the center of the min and max x, y, z values
    //         box.position.set((min.x + max.x) / 2, (min.y + max.y) / 2, minZ + (maxZ - minZ) / 2);

    //         // Add the box to the array
    //         boxes.push(box);

    //         // Create an edges helper from the box
    //         let edges = new THREE.EdgesHelper(box, 0x000000);

    //         // Add the box and edges to the overlay
    //         this.viewer.impl.addOverlay('levels-overlay', box);
    //         this.viewer.impl.addOverlay('levels-overlay', edges);
    //     }

    //     return boxes;
    // }

    getCOG(dbId) {
        const instanceTree = this.viewer.model.getInstanceTree();
        let fragIds = [];

        instanceTree.enumNodeFragments(dbId, function (fragId) {
            fragIds.push(fragId);
        }, true);

        let options = {
            quantil: 1,
            allowlist: fragIds
        };

        let fuzzyBox = this.viewer.model.getFuzzyBox(options);

        // Get the center of the bounding box
        let center = fuzzyBox.getCenter(new THREE.Vector3());

        return center;
    }

    createDbIdToCOG() {
        
        // Create an empty object to store the dbIds and their COGs
        let dbIdToCOG = {};

        // Iterate over the values of targetNodesMap
        for (const model of this.targetNodesMap.values()) {
            // Iterate over the items in each value
            for (const dbId of model) {
                const cog = this.getCOG(dbId);

                // Add the dbId and its COG to the object
                dbIdToCOG[dbId] = cog;
            }
        }

        // Return the dbIdToCOG object
        return dbIdToCOG;
    }

    createWorkAreaToDbIds() {
        // Create an empty object to store the workAreas and their dbIds
        const workAreaToDbIds = {};

        // Create a bounding box from the mesh object
        const box = new THREE.Box3().setFromObject(this.tempBboxMesh);

        // // // Initialize the work area with an empty array
        workAreaToDbIds[this.tempBboxMesh.workArea] = [];

        // Iterate over the entries of this.extension.dbIdToCOG
        for (const [dbId, cog] of Object.entries(this.dbIdToCOG)) {
            // Check if the COG is contained within the box
            if (box.containsPoint(cog)) {
                // Add the dbId to the array under the corresponding workArea
                workAreaToDbIds[this.tempBboxMesh.workArea].push(Number(dbId)); 
            }
        }

        // Return the workAreaToDbIds object
        return workAreaToDbIds;
    }

    // Download IFC data as a file
    downloadIfc(data, filename) {
        const blob = new Blob([data], { type: 'application/octet-stream' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', filename);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
    
    runPythonScript(paramsArray) {
        const SERVER_URL = window.location.hostname.includes('localhost') ? 'http://localhost:8080' : 'https://au-aps-app.azurewebsites.net';

        // console.log("SERVER_URL:", SERVER_URL);
        // console.log("paramsArray:", paramsArray);
        // console.log("JSON stringified paramsArray:", JSON.stringify(paramsArray));

        fetch(`${SERVER_URL}/run-script`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(paramsArray),
        })
        .then(response => response.blob())
        .then(blob => {
            const filename = 'model.ifc';
            this.downloadIfc(blob, filename);
        })
        .catch((error) => {
            console.error('Error:', error);
        });
    }
}

Autodesk.Viewing.theExtensionManager.registerExtension('SearchSetsExtension', SearchSetsExtension);