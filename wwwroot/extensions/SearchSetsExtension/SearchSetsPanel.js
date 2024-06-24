export class SearchSetsPanel extends Autodesk.Viewing.UI.DockingPanel {
    constructor(extension, id, title, options) {
        super(extension.viewer.container, id, title, options);
        this.extension = extension;
        this.container.style.right = (options.x || 0) + 'px';
        this.container.style.top = (options.y || 0) + 'px';
        this.container.style.width = (options.width || 800) + 'px';
        this.container.style.height = (options.height || 800) + 'px';
    }

    

    initialize() {
        this.title = this.createTitleBar(this.titleLabel || this.container.id);
        this.initializeMoveHandlers(this.title);
        this.container.appendChild(this.title);
        this.closer = this.createCloseButton();
        this.initializeCloseHandler(this.closer);
        this.container.appendChild(this.closer);
        this.behaviourType = "Construction";

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
                const loadedTasks = $('#loadedTasks');
                const loadedSearchSets = $('#loadedSearchSets');
                const modelMatchDiv = $('#modelMatchDiv');
                const modelSelect = $('#modelSelect');
                const viewerModel = $('#viewerModel');
                const searchsetsModel = $('#searchsetsModel');
                const hideLinkedSwitch = $('#hideLinkedSwitch');
                const downloadTsvButton = $('#downloadTsvButton');
                const selectTaskDiv = $('#selectTaskDiv');
                this.createdTasksSwitch = $('#createdTasksSwitch');  
                this.linkedTasksSwitch = $('#linkedTasksSwitch');  
                const taskDropdown = $('#taskDropdown');
                const newTaskTypeRadio = $('[name="newTaskTypeRadio"]');
                const subTaskRadio = $('#subTaskRadio');
                const taskParametersDiv = $('#taskParametersDiv');
                const linkSubtaskForm = $('#linkSubtaskForm');
                this.linkSubtaskSwitch = $('#linkSubtaskSwitch');
                const modelNameForm = $('#modelNameForm');
                this.modelNameInput = $('#modelNameInput');
                const taskNameForm = $('#taskNameForm');
                this.taskNameInput = $('#taskNameInput');
                const taskStartFinshForm = $('#taskStartFinshForm');
                this.taskStartInput = $('#taskStartInput');
                this.taskFinishInput = $('#taskFinishInput');
                const numberOfSubtasksForm = $('#numberOfSubtasksForm');
                const numberOfSubtasksInput = $('#numberOfSubtasksInput');
                const subtaskParamsRadios = $('#subtaskParamsRadios');
                const subtaskBehaviourRadio = $('[name="subtaskBehaviourRadio"]');
                this.linksReportDiv = $('#linksReport');
                // const linksReportEditButton = $('#linksReportEditButton');
                // const linksReportDeleteButton = $('#linksReportDeleteButton');
                this.tempSubTasksReportDiv = $('#tempSubTasksReport');
                this.tempLinksReportDiv = $('#tempLinksReport');
                this.addSubTasksButton = $('#addSubTasksButton');
                const tooltipTriggerList = $('[data-bs-toggle="tooltip"]');

                // const tooltipList = Array.from(tooltipTriggerList).map(tooltipTriggerEl => {
                //     const tooltip = new bootstrap.Tooltip(tooltipTriggerEl, {
                //         delay: {
                //             show: 1000,
                //         },
                //         trigger: 'hover'
                //     });

                //     // Hide tooltip on mouse leave
                //     tooltipTriggerEl.on('mouseleave', () => {
                //         tooltip.hide();
                //     });

                //     return tooltip;
                // });

                // Add event listener to the tasks input
                loadedTasks.on('change', (event) => {
                    const file = event.target.files[0];
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        
                        const lines = event.target.result.split('\n');
                        this.importedTasks = lines.slice(1) // Skip the header line
                            .filter(line => line.trim() !== '' && line.split('\t').length > 1) // Filter out empty lines or lines without tabs
                            .map(line => {
                                const [, ActionName, ParentTaskId, TaskId, TaskCode, IsCreatedTask, Name, StartDateTime, FinishDateTime] = line.split('\t');
                                return { ActionName, ParentTaskId, TaskId, TaskCode, IsCreatedTask, Name, StartDateTime, FinishDateTime };
                            });
                        console.log("this.importedTasks", this.importedTasks);

                        // Filter and convert task IDs to numbers, ignoring invalid numbers
                        this.updateTaskIds();

                        // Calculate the maximum task ID, ensuring no NaN values are present
                        this.maxTaskId = this.taskIds.length > 0 ? Math.max(...this.taskIds) : undefined;

                        const { minStartDate, maxFinishDate } = this.getMinMaxDates();

                        // Assuming minStartDate and maxFinishDate are already in the "YYYY-MM-DD" format
                        this.taskStartInput.attr('min', minStartDate).attr('max', maxFinishDate).val(minStartDate);

                        this.taskFinishInput.attr('min', minStartDate).attr('max', maxFinishDate).val(maxFinishDate);

                        // Populate the dropdown with all task names
                        this.populateDropdown();

                        console.log("createdTasksSwitch", this.createdTasksSwitch);

                        selectTaskDiv.removeClass('d-none');
                        subTaskRadio.prop('disabled', false);

                    };
                    reader.readAsText(file);
                });

                // Add event listener to the search sets input
                loadedSearchSets.on('change', (event) => {
                    if (!event.target.files.length) {
                        modelMatchDiv.addClass('d-none');
                        return; // Exit early if no file is selected
                    }
                    const file = event.target.files[0];
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        this.linkedTasksSwitch.prop('disabled', false);
                    
                        const lines = event.target.result.split('\n');
                        this.importedSearchSets = lines.slice(1) // Skip the header line
                            .filter(line => line.trim() !== '' && line.split('\t').length > 1) // Filter out empty lines or lines without enough tabs
                            .map(line => {
                                const [, ActionName, TaskId, TaskName, TaskCode, ModelName, BehaviourType, AnyOfTheseMode, SearchSetGroup, PropertyName, Operator, PropertyValue] = line.split('\t');
                                return { ActionName, TaskId, TaskName, TaskCode, ModelName, BehaviourType, AnyOfTheseMode, SearchSetGroup, PropertyName, Operator, PropertyValue };
                            });

                        //remove d-none from modelMatchDiv
                        modelMatchDiv.removeClass('d-none');

                        // Create a set of unique ModelName values
                        const searchSetsModelNames = new Set(this.importedSearchSets.map(set => set.ModelName));

                        // Prepare options as HTML string
                        let modelNamesHtml = '';
                        searchSetsModelNames.forEach(modelName => {
                            modelNamesHtml += `<option value="${modelName}">${modelName}</option>`;
                        });

                        // Populate the searchsetsModel select element using jQuery
                        searchsetsModel.empty().append(modelNamesHtml);
                    };
                    reader.readAsText(file);
                });

                viewerModel.val(this.extension.getFileInfo(this.extension.viewer.model, "name")).attr("title", this.extension.getFileInfo(this.extension.viewer.model, "name"));

                searchsetsModel.on('change', (event) => {
                    // Assuming the value of the event target is the selected ModelName
                    this.selectedModelName = event.target.value;

                    // If this.modelNameInput's value is empty, then assign this.selectedModelName to it
                    if (!this.modelNameInput.val() || this.modelNameInput.val().trim() === '') {
                        this.modelNameInput.val(this.selectedModelName);
                    }

                    // Filter importedSearchSets by ModelName
                    this.selectedModelSearchSets = this.importedSearchSets.filter(searchSet => searchSet.ModelName === this.selectedModelName);
                    hideLinkedSwitch.prop('disabled', false);
                });

                hideLinkedSwitch.on('change', (event) => {
                    if (event.target.checked) {
                        this.hideLinkedModelElements();
                    } else {
                        this.extension.viewer.showAll();
                    }
                });

                downloadTsvButton.on('click', () => {
                    // Convert the tasks to TSV format
                    const tsvString = this.convertTasksToTsvString(this.importedTasks);
                    // Download the TSV file
                    this.downloadTSVFile(tsvString);  

                    if (this.extension.tempLinks) {
                        // Convert the search sets to TSV format
                        const tsvStringSearchSets = this.convertSearchSetsToTsvString(this.importedSearchSets);
                        // Download the TSV file
                        this.downloadTSVFile(tsvStringSearchSets, 'updated_imported_search_sets.tsv'); 
                   }

                    downloadTsvButton.prop('disabled', true);

                    
                });

                // Add event listener to the this.createdTasksSwitch
                this.createdTasksSwitch.on('change', () => {
                    // Populate the dropdown based on the current state of the switches
                    this.populateDropdown();
                });

                //Add event listener to the this.linkedTasksSwitch
                this.linkedTasksSwitch.on('change', () => {
                    // Populate the dropdown based on the current state of the switches
                    this.populateDropdown();
                });

                taskDropdown.select2({
                    width: '100%' // Ensure the dropdown takes the whole width
                }).on('select2:select', (event) => {
                    console.log("taskDropdown event", event);
                    var data = event.params.data;
                    this.selectedTaskId = Number(data.id);
                    console.log(" taskDropdown this.selectedTaskId", this.selectedTaskId);
                    this.selectedTaskName = data.text;
                    console.log(" taskDropdown this.selectedTaskName", this.selectedTaskName);

                    // Find the selected task object in this.importedTasks
                    const selectedTask = this.importedTasks.find(task => task.TaskId !== undefined && Number(task.TaskId) === Number(this.selectedTaskId));
                    console.log("taskDropdown selectedTask", selectedTask);
                    if (selectedTask) {
                        this.selectedTaskStart = selectedTask.StartDateTime.includes(':') ? 
                                                selectedTask.StartDateTime : 
                                                `${selectedTask.StartDateTime} 8:00 AM`;
                        console.log(" taskDropdown this.selectedTaskStart", this.selectedTaskStart);
                        this.selectedTaskFinish = selectedTask.FinishDateTime.includes(':') ? 
                                                selectedTask.FinishDateTime : 
                                                `${selectedTask.FinishDateTime} 5:00 PM`;
                        console.log("taskDropdown- this.selectedTaskFinish", this.selectedTaskFinish);
                    } else {
                        // Handle case where the selected task is not found
                        this.selectedTaskStart = null;
                        this.selectedTaskFinish = null;
                    }

                    if (this.importedSearchSets && this.importedSearchSets.length > 0) {
                        console.log("taskDropdown this.importedSearchSets", this.importedSearchSets);
                        // Filter the searchSets array to get the search sets for the selected task
                        this.selectedTaskSearchSets = this.importedSearchSets.filter(searchSet => Number(searchSet.TaskId) === Number(this.selectedTaskId));
                        console.log("taskDropdown this.selectedTaskSearchSets", this.selectedTaskSearchSets);
                        this.isolateLinkedTaskElements();
                        this.createTabulatorTableForTaskLinks(this.createSelectedTaskLinks());
                    }
                });

                newTaskTypeRadio.on('change', (event) => {
                    taskParametersDiv.removeClass('d-none');
                    this.tempSubTasksReportDiv.html('');
                    if (this.modelNameInput.val() === '') {
                        this.modelNameInput.val(searchsetsModel.val());
                    }
                    if (event.target.id === 'newTaskRadio') {
                        this.newTaskType = "new";
                        console.log('New Task radio button selected');
                        linkSubtaskForm.addClass('d-none');
                        // modelNameForm.addClass('d-none');
                        taskStartFinshForm.removeClass('d-none');

                        taskNameForm.removeClass('d-none');
                        this.linkSubtaskSwitch.prop('checked', false).trigger('change');
                        numberOfSubtasksForm.addClass('d-none');
                        subtaskParamsRadios.addClass('d-none');
                        // Perform actions for when New Task is selected
                    } else if (event.target.id === 'subTaskRadio') {
                        this.newTaskType = "sub";
                        console.log('Sub Task radio button selected');
                        linkSubtaskForm.removeClass('d-none');
                        // modelNameForm.removeClass('d-none');
                        taskNameForm.addClass('d-none');
                        this.taskNameInput.val('Default Task');
                        taskStartFinshForm.addClass('d-none');
                        numberOfSubtasksForm.removeClass('d-none');
                        subtaskParamsRadios.removeClass('d-none');

                        // Perform actions for when Sub Task is selected
                    }
                });

                this.taskNameInput.on('input', () => {
                    const inputValue = this.taskNameInput.val().trim();
                    if (inputValue.length > 0) {
                        const arrayOfIntegers = [1];
                        this.extension.tempSubTasks = this.extension.generateTempSubTasks(arrayOfIntegers);
                        this.createTabulatorTableForTempSubTasks(this.extension.tempSubTasks);
                    } else {
                        this.addSubTasksButton.prop('disabled', true);
                        this.tempSubTasksReportDiv.html('');
                        console.log('Task name input is empty');
                    }
                });

                numberOfSubtasksInput.on('input', () => {
                    const inputValue = parseInt(numberOfSubtasksInput.val(), 10);
                    if (!isNaN(inputValue)) {
                        const arrayOfIntegers = Array.from({ length: inputValue }, (_, index) => index + 1);
                        this.extension.tempSubTasks = this.extension.generateTempSubTasks(arrayOfIntegers);
                        this.createTabulatorTableForTempSubTasks(this.extension.tempSubTasks);
                    } else {
                        this.addSubTasksButton.prop('disabled', true);  
                        this.tempSubTasksReportDiv.html('');
                        console.log('Input value is not a valid integer');
                    }
                });


                // Add an event listener for the change event
                this.linkSubtaskSwitch.on('change', () => {
                    console.log("this.extension", this.extension)
                    this.tempSubTasksReportDiv.html('');
                    console.log("this.extension.viewer.model", this.extension.viewer.model)
                    const isSwitchOn = this.linkSubtaskSwitch.prop('checked'); // Get the checked property using jQuery

                    // Additional action when the switch is off
                    if (!isSwitchOn) {
                        // subtaskParamsRadios.addClass('d-none');
                        this.tempLinksReportDiv.html('');
                        // this.addSubTasksButton.prop('disabled', true);
                        numberOfSubtasksForm.removeClass('d-none');
                        modelNameForm.addClass('d-none');
                    } else {
                        // subtaskParamsRadios.removeClass('d-none');
                        numberOfSubtasksForm.addClass('d-none');
                        numberOfSubtasksInput.val('');
                        modelNameForm.removeClass('d-none');
                    }
                });

                // Assuming this code is inside a class or an object context
                subtaskBehaviourRadio.each((index, radio) => {
                    $(radio).on('change', () => {
                        var behaviourTypeText = $('label[for="' + radio.id + '"]').text();
                        this.behaviourType = behaviourTypeText;
                    });
                });

                // this.tempSubTasksReportDiv.on('input', () => {
                //     console.log("this.tempSubTasksReportDiv changed", this.tempSubTasksReportDiv.val());
                //     if (this.tempSubTasksReportDiv.val()) {
                //         this.addSubTasksButton.prop('disabled', false);
                //     } else {
                //         this.addSubTasksButton.prop('disabled', true);

                //     }
                // });

                // linksReportEditButton.on('click', () => {
                //     this.toggleEditWorkAreaFormVisibility();
                // });

                this.addSubTasksButton.on('click', () => {
                    Array.prototype.push.apply(this.importedTasks, this.extension.tempSubTasks);
                    this.extension.tempSubTasks = [];
                    if (this.extension.tempLinks) {
                        Array.prototype.push.apply(this.importedSearchSets, this.extension.tempLinks);
                        this.extension.tempLinks = [];
                        this.linkSubtaskSwitch.prop('checked', false).trigger('change');
                    }
                    downloadTsvButton.prop('disabled', false);
                    // Filter and convert task IDs to numbers, ignoring invalid numbers
                    this.updateTaskIds();
                    this.populateDropdown();
                    this.addSubTasksButton.prop('disabled', true);
                    this.tempSubTasksReportDiv.html('');
                    numberOfSubtasksInput.val('');
                });


            })
            .catch((error) => {
                console.error('Error:', error);
            });
    }

    getMinMaxDates() {
        const DateTime = luxon.DateTime;

        const dates = this.importedTasks.map(task => {
            const startDate = DateTime.fromFormat(task.StartDateTime.split(' ')[0], "d/MM/yyyy");
            const finishDate = DateTime.fromFormat(task.FinishDateTime.split(' ')[0], "d/MM/yyyy");
            return { startDate, finishDate };
        });

        // Filter out invalid dates
        const validDates = dates.filter(({ startDate, finishDate }) => startDate.isValid && finishDate.isValid);

        if (validDates.length === 0) {
            return { minStartDate: null, maxFinishDate: null };
        }

        let minStartDate = validDates[0].startDate;
        let maxFinishDate = validDates[0].finishDate;

        validDates.forEach(({ startDate, finishDate }) => {
            if (startDate < minStartDate) {
                minStartDate = startDate;
            }
            if (finishDate > maxFinishDate) {
                maxFinishDate = finishDate;
            }
        });

        // Return the dates as Luxon DateTime objects
        // Convert to desired format here if needed, e.g., minStartDate.toFormat("d/MM/yyyy")
        return {
            minStartDate: minStartDate.toFormat("yyyy-MM-dd"),
            maxFinishDate: maxFinishDate.toFormat("yyyy-MM-dd")
        };
    }

    updateTaskIds() {
        this.taskIds = this.importedTasks
            .map(task => Number(task.TaskId))
            .filter(taskId => !isNaN(taskId));
    }

    populateDropdown() {
        // Clear the dropdown
        taskDropdown.innerHTML = '';

        // Combined filtering based on switches
        const filteredTasks = this.importedTasks.filter(task => {
            const isCreatedTask = !this.createdTasksSwitch.prop('checked') || task.IsCreatedTask === 'True';
            const isInSearchSets = !this.linkedTasksSwitch.prop('checked') || this.importedSearchSets.some(searchSet => searchSet.TaskId === task.TaskId);
            return isCreatedTask && isInSearchSets;
        });

        // Populate the dropdown with task names
        filteredTasks.forEach((task, index) => {
            const option = document.createElement('option');
            option.value = task.TaskId;
            option.text = task.Name;
            taskDropdown.add(option);
        });

        $(taskDropdown).trigger({
            type: 'select2:select',
            params: {
                data: $(taskDropdown).select2('data')[0] // Gets the currently selected item data
            }
        });
    }

    createSelectedModelLinks() {
        // Initialize an empty Map
        const modelLinks = new Map();

        // Iterate over the selectedModelSearchSets
        for (const searchSet of this.selectedModelSearchSets) {
            // Replace the dot in the PropertyName with a forward slash
            const pSet = searchSet.PropertyName.replace('.', '/');

            // Remove the \r character from the PropertyValue
            const propertyValue = searchSet.PropertyValue.replace(/\r$/, '');

            // If the modelLinks Map already has the formattedPropertyName as a key, push the PropertyValue to the existing array
            if (modelLinks.has(pSet)) {
                modelLinks.get(pSet).push(propertyValue);
            } 
            // If the modelLinks Map does not have the formattedPropertyName as a key, add a new key-value pair with the formattedPropertyName and an array containing the PropertyValue
            else {
                modelLinks.set(pSet, [propertyValue]);
            }
        }

        return modelLinks;
    }

    createSelectedTaskLinks() {
        // Initialize an empty Map
        const taskLinks = new Map();

        // Iterate over the selectedSearchSets
        for (const searchSet of this.selectedTaskSearchSets) {
            // Replace the dot in the PropertyName with a forward slash
            const pSet = searchSet.PropertyName.replace('.', '/');

            // Remove the \r character from the PropertyValue
            const propertyValue = searchSet.PropertyValue.replace(/\r$/, '');

            // If the pSetKeys Map already has the formattedPropertyName as a key, push the PropertyValue to the existing array
            if (taskLinks.has(pSet)) {
                taskLinks.get(pSet).push(propertyValue);
            } 
            // If the pSetKeys Map does not have the formattedPropertyName as a key, add a new key-value pair with the formattedPropertyName and an array containing the PropertyValue
            else {
                taskLinks.set(pSet, [propertyValue]);
            }
        }

        return taskLinks;
    }

    getDbidsByLinks(links, propertySet) {
        const dbIds = [];
        for (const key of links.keys()) {
            for (const [key, properties] of Object.entries(propertySet.map)) {
                for (const property of properties) {
                    if (links.has(key)) {
                        const values = links.get(key).map(value => value.trim());
                        if (values.includes(property.displayValue)) {
                            dbIds.push(property.dbId);
                        }
                    }
                }
            }
        }
        return dbIds;
    }

    hideLinkedModelElements() {
        const modelLinks = this.createSelectedModelLinks();
        const firstTargetNodesMapObject = this.extension.targetNodesMap.values().next().value;

        this.extension.viewer.model.getPropertySetAsync(firstTargetNodesMapObject, {})
            .then(propertySet => {
                const dbIds = this.getDbidsByLinks(modelLinks, propertySet);
                const model = this.extension.viewer.model;
                if (model && dbIds.length > 0) {
                    this.extension.viewer.hide(dbIds, model);
                }
            });
    }

    isolateLinkedTaskElements() {
        const taskLinks = this.createSelectedTaskLinks();
        const firstTargetNodesMapObject = this.extension.targetNodesMap.values().next().value;

        this.extension.viewer.model.getPropertySetAsync(firstTargetNodesMapObject, {})
            .then(propertySet => {
                const dbIds = this.getDbidsByLinks(taskLinks, propertySet);
                const model = this.extension.viewer.model;
                if (model) {
                    let selectionDef = {
                        model: model,
                        ids: dbIds,
                    };
                    this.extension.viewer.setAggregateSelection([selectionDef], true);
                    this.extension.viewer.isolate(dbIds, model);
                    this.extension.viewer.fitToView(dbIds, model);
                }
            });
    }

    // hideLinkedModelElements() {
    //     // Define modelLinks with this.createSelectedModelLinks
    //     const modelLinks = this.createSelectedModelLinks();

    //     // Get the first object from this.targetNodesMap
    //     const firstTargetNodesMapObject = this.extension.targetNodesMap.values().next().value;

    //     // Call getPropertySetAsync with the dbIds from the first object in this.targetNodesMap
    //     this.extension.viewer.model.getPropertySetAsync(firstTargetNodesMapObject, {})
    //         .then(propertySet => {
    //             // Initialize an empty array to store the dbIds
    //             const dbIds = [];

    //             // Iterate over the keys in modelLinks
    //             for (const key of modelLinks.keys()) {
    //                 // Iterate over the properties in propertySet.map
    //                 for (const [key, properties] of Object.entries(propertySet.map)) {
    //                     // Iterate over the properties array
    //                     for (const property of properties) {
    //                         // Check if the key exists in modelLinks
    //                         if (modelLinks.has(key)) {
    //                             // Get the values for this key from modelLinks and remove the \r character
    //                             const values = modelLinks.get(key).map(value => value.trim());

    //                             // Check if the displayValue is in the values
    //                             if (values.includes(property.displayValue)) {
    //                                 // If it is, add the dbId to the dbIds array
    //                                 dbIds.push(property.dbId);
    //                             }
    //                         }
    //                     }
    //                 }
    //             }

    //             // If model is not null, hide the elements
    //             const model = this.extension.viewer.model;
    //             if (model && dbIds.length > 0) {
    //                 // Hide the corresponding model elements in the viewer
    //                 this.extension.viewer.hide(dbIds, model);
    //             }
    //         });
    // }


    // isolateLinkedTaskElements() {
    //     // Initialize an empty Map
    //     const taskLinks = this.createSelectedTaskLinks();

    //     // Get the first object from this.targetNodesMap
    //     const firstTargetNodesMapObject = this.extension.targetNodesMap.values().next().value;

    //     // Call getPropertySetAsync with the dbIds from the first object in this.targetNodesMap
    //     this.extension.viewer.model.getPropertySetAsync(firstTargetNodesMapObject, {})
    //         .then(propertySet => {

    //             // Initialize an empty array to store the dbIds
    //             const dbIds = [];

    //             // Iterate over the keys in taskLinks
    //             for (const key of taskLinks.keys()) {

    //                 // Iterate over the properties in propertySet.map
    //                 for (const [key, properties] of Object.entries(propertySet.map)) {

    //                     // Iterate over the properties array
    //                     for (const property of properties) {
    //                         // Check if the key exists in pSetKeys
    //                         if (taskLinks.has(key)) {

    //                             // Get the values for this key from pSetKeys and remove the \r character
    //                             const values = taskLinks.get(key).map(value => value.trim());

    //                             // Check if the displayValue is in the values
    //                             if (values.includes(property.displayValue)) {
    //                                 // If it is, add the dbId to the dbIds array
    //                                 dbIds.push(property.dbId);
    //                             } else {
    //                                 // Check if the displayValue is in the values
    //                             }
    //                         }
    //                     }
    //                 }
    //             }


    //             // If model is not null, create the selection definition and select the elements
    //             const model = this.extension.viewer.model;
    //             if (model) {
    //                 // Create the selection definition
    //                 let selectionDef = {
    //                     model: model,
    //                     ids: dbIds,
    //                 };

    //                 // Select the corresponding model elements in the viewer
    //                 this.extension.viewer.setAggregateSelection([selectionDef], true);

    //                 // Isolate and fit the view to the selected elements
    //                 this.extension.viewer.isolate(dbIds, model);
    //                 this.extension.viewer.fitToView(dbIds, model);
    //             }


    //         });
    // }



    // Helper function to convert tasks to TSV format including headers
    convertTasksToTsvString(tasks) {
        // Define headers
        const headers = "ActionName\tParentTaskId\tTaskId\tTaskCode\tIsCreatedTask\tName\tStartDateTime\tFinishDateTime";

        // Convert tasks to TSV format
        const tasksTsv = tasks.map(task => {
            return [
                task.ActionName,
                task.ParentTaskId,
                task.TaskId,
                task.TaskCode,
                task.IsCreatedTask,
                task.Name,
                task.StartDateTime,
                task.FinishDateTime
            ].join('\t');
        }).join('\n');

        // Prepend headers to the tasks TSV
        return headers + '\n' + tasksTsv;
    }

    convertSearchSetsToTsvString(links) {
        // Define headers
        const headers = "ActionName\tTaskId\tTaskName\tTaskCode\tModelName\tBehaviourType\tAnyOfTheseMode\tSearchSetGroup\tPropertyName\tOperator\tPropertyValue";

        // Convert links to TSV format
        const linksTsv = links.map(link => {
            return [
                link.ActionName,
                link.TaskId,
                link.TaskName,
                link.TaskCode,
                link.ModelName,
                link.BehaviourType,
                link.AnyOfTheseMode,
                link.SearchSetGroup,
                link.PropertyName,
                link.Operator,
                link.PropertyValue
            ].join('\t');
        }).join('\n');

        // Prepend headers to the links TSV
        return headers + '\n' + linksTsv;
    }

    downloadTSVFile(tsvString, filename = 'updated_imported_tasks.tsv') {
        const blob = new Blob([tsvString], { type: 'text/tab-separated-values' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    toggleEditWorkAreaFormVisibility() {
        if (this.editForm.classList.contains('d-none')) {
            // If the form is hidden, show it and add opacity to the panels
            this.editForm.classList.remove('d-none');
            this.setUpPanel.classList.add('opacity-25', 'pe-none');
            this.workAreasReportPanel.classList.add('opacity-25', 'pe-none');
        } else {
            // If the form is visible, hide it and remove opacity from the panels
            this.editForm.classList.add('d-none');
            this.setUpPanel.classList.remove('opacity-25', 'pe-none');
            this.workAreasReportPanel.classList.remove('opacity-25', 'pe-none');
            // Clear the form values
            document.getElementById('zoneEdit').value = '';
            document.getElementById('subzoneEdit').value = '';
            document.getElementById('workareaEdit').value = '';
        }
    }

    taskLinksToTabulatorData(taskLinks) {
        // Convert the Map to an array of [key, value] pairs
        const entries = Array.from(taskLinks.entries());

        // Map over the entries and convert each [key, value] pair into an object
        return entries.map(([key, values]) => {
            // Map over the values and convert each value into an object
            return values.map(value => {
                return {
                    Key: key,
                    Value: value
                };
            });
        }).flat();  // Flatten the array of arrays into a single array
    }

    createTabulatorTableForTaskLinks(taskLinks) {
        // Create data array
        let data = this.taskLinksToTabulatorData(taskLinks);
    
        // Create Tabulator table
        this.table = new Tabulator(this.linksReportDiv[0], {
            index: "Key", // Use Key as the unique id for each row
            layout: 'fitData',
            selectableRows: 1,
            data: data,
            // height: "100%", // Set the height of the table to 100%
            columns: [
                {title: "Property", field: "Key"},
                {title: "Value", field: "Value"},
            ],
        });
    
        // // Add row selection event listener
        // this.table.on("rowSelected", (row) => {
        //     this.selectedRowData = row.getData();
        //     this.reportEditButton.disabled = false;
        //     this.reportDeleteButton.disabled = false;
        // });
    
        // // Add row deselection event listener
        // this.table.on("rowDeselected", (row) => {
        //     this.reportEditButton.disabled = true;
        //     this.reportDeleteButton.disabled = true;
        // });
    }

    createTabulatorTableForTempSubTasks(tempSubTasks) {
        // Convert tempSubTasks to Tabulator data format
        let data = tempSubTasks.map(task => ({
            ActionName: task.ActionName,
            FinishDateTime: task.FinishDateTime,
            IsCreatedTask: task.IsCreatedTask,
            Name: task.Name,
            ParentTaskId: task.ParentTaskId,
            StartDateTime: task.StartDateTime,
            TaskCode: task.TaskCode,
            TaskId: task.TaskId,
        }));

        // Create Tabulator table
        this.subTasksTable = new Tabulator(this.tempSubTasksReportDiv[0], {
            layout: 'fitData',
            selectableRows: 1,
            data: data,
            columns: [
                {title: "Action Name", field: "ActionName"},
                {title: "Parent Task ID", field: "ParentTaskId"},
                {title: "Task ID", field: "TaskId"},
                {title: "Task Code", field: "TaskCode"},
                {title: "Is Created Task", field: "IsCreatedTask"},
                {title: "Name", field: "Name"},
                {title: "Start Date Time", field: "StartDateTime"},
                {title: "Finish Date Time", field: "FinishDateTime"},
            ],
        });

            this.addSubTasksButton.prop('disabled', false);
    }

    createTabulatorTableForTempLinks(tempLinks) {
        // Convert tempLinks to Tabulator data format
        let data = tempLinks.map(link => ({
            ActionName: link.ActionName,
            AnyOfTheseMode: link.AnyOfTheseMode,
            BehaviourType: link.BehaviourType,
            ModelName: link.ModelName,
            Operator: link.Operator,
            PropertyName: link.PropertyName,
            PropertyValue: link.PropertyValue,
            SearchSetGroup: link.SearchSetGroup,
            TaskCode: link.TaskCode,
            TaskId: link.TaskId,
            TaskName: link.TaskName,
        }));

        // Create Tabulator table
        this.tempLinksTable = new Tabulator(this.tempLinksReportDiv[0], {
            layout: 'fitData',
            selectableRows: 1,
            data: data,
            columns: [
                {title: "Action Name", field: "ActionName"},
                {title: "Task ID", field: "TaskId"},
                {title: "Task Name", field: "TaskName"},
                {title: "Task Code", field: "TaskCode"},
                {title: "Model Name", field: "ModelName"},
                {title: "Behaviour Type", field: "BehaviourType"},
                {title: "Any Of These Mode", field: "AnyOfTheseMode"},
                {title: "Search Set Group", field: "SearchSetGroup"},
                {title: "Property Name", field: "PropertyName"},
                {title: "Operator", field: "Operator"},
                {title: "Property Value", field: "PropertyValue"},
            ],
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
    }

    // hideModelElements(mesh) {
    //     let nodes = mesh.userData.filteredDbids;
    //     let model = mesh.userData.model;

    //     // Hide the nodes in the model
    //     this.extension.viewer.hide(nodes, model);
    // }

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