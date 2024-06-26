export class BaseExtension extends Autodesk.Viewing.Extension {
    constructor(viewer, options) {
        super(viewer, options);
        this._onObjectTreeCreated = (ev) => this.onModelLoaded(ev.model);
        this._onSelectionChanged = (ev) => this.onSelectionChanged(ev.model, ev.dbIdArray);
        this._onIsolationChanged = (ev) => this.onIsolationChanged(ev.model, ev.nodeIdArray);
        this._onGeometryLoaded = (ev) => this.onGeometryLoaded(ev.model);
        this._onExtensionLoaded = (ev) => this.onExtensionLoaded(ev.extensionId);
        this._onModelUnloaded = (ev) => this.onModelUnloaded(ev.model);
        this.targetNodesMap = new Map(); // Initialize targetNodesMap after calling super

        // Define new event handlers
        this._onEscape = (ev) => this.onEscape(ev);
        this._onShow = (ev) => this.onShow(ev);
        this._onShowAll = (ev) => this.onShowAll(ev);

    }

    async load() {
        this.viewer.addEventListener(Autodesk.Viewing.OBJECT_TREE_CREATED_EVENT, this._onObjectTreeCreated);
        this.viewer.addEventListener(Autodesk.Viewing.AGGREGATE_SELECTION_CHANGED_EVENT, this._onSelectionChanged);
        this.viewer.addEventListener(Autodesk.Viewing.ISOLATE_EVENT, this._onIsolationChanged);
        this.viewer.addEventListener(Autodesk.Viewing.GEOMETRY_LOADED_EVENT, this._onGeometryLoaded);
        this.viewer.addEventListener(Autodesk.Viewing.EXTENSION_LOADED_EVENT, this._onExtensionLoaded);
        this.viewer.addEventListener(Autodesk.Viewing.MODEL_UNLOADED_EVENT, this._onModelUnloaded);

        this.viewer.addEventListener(Autodesk.Viewing.ESCAPE_EVENT, this._onEscape);
        this.viewer.addEventListener(Autodesk.Viewing.SHOW_EVENT, this._onShow);
        this.viewer.addEventListener(Autodesk.Viewing.SHOW_ALL_EVENT, this._onShowAll);

        await this.setTargetNodesMapAllModels();    

        return true;
    }

    unload() {
        this.viewer.removeEventListener(Autodesk.Viewing.OBJECT_TREE_CREATED_EVENT, this._onObjectTreeCreated);
        this.viewer.removeEventListener(Autodesk.Viewing.AGGREGATE_SELECTION_CHANGED_EVENT, this._onSelectionChanged);
        this.viewer.removeEventListener(Autodesk.Viewing.ISOLATE_EVENT, this._onIsolationChanged);
        this.viewer.removeEventListener(Autodesk.Viewing.GEOMETRY_LOADED_EVENT, this._onGeometryLoaded);
        this.viewer.removeEventListener(Autodesk.Viewing.EXTENSION_LOADED_EVENT, this._onExtensionLoaded);
        this.viewer.removeEventListener(Autodesk.Viewing.MODEL_UNLOADED_EVENT, this._onModelUnloaded);

        this.viewer.removeEventListener(Autodesk.Viewing.ESCAPE_EVENT, this._onEscape);
        this.viewer.removeEventListener(Autodesk.Viewing.SHOW_EVENT, this._onShow);
        this.viewer.removeEventListener(Autodesk.Viewing.SHOW_ALL_EVENT, this._onShowAll);

        return true;
    }
    
    async onModelLoaded(model) {
        await this.setTargetNodesMapSingleModel(model);
    }

    onModelUnloaded(model) {
        const allModels = this.viewer.getAllModels();
        // Iterate over the keys of targetNodesMap
        for (let key of this.targetNodesMap.keys()) {
            // If the key is not in modelNames, delete it from targetNodesMap
            if (!allModels.includes(key)) {
                this.targetNodesMap.delete(key);
            }
        }
    }

    onSelectionChanged() {}

    onIsolationChanged(model, dbids) {}

    async onGeometryLoaded(model) {
        const targetNodes = await this.findTargetNodes(model);
        this.targetNodesMap.set(model, targetNodes); // Store targetNodes in the Map
    }

    onExtensionLoaded(extensionId) {}

    getFileInfo(model, property) {
        const doc = model.getDocumentNode().getDocument();
        const data = doc.getRoot().data.children[0];
        return data.hasOwnProperty(property) ? data[property] : null;
    }    

    getAllDbIds(model) {
        let instanceTree = model.getData().instanceTree;
        let allDbIds = Object.keys(instanceTree.nodeAccess.dbIdToIndex).map(Number);
        return allDbIds;
    }

    async findIfcNodes(model) {
        let allNodes = this.getAllDbIds(model);        
        let propSet = await model.getPropertySetAsync(allNodes, {});
        const itemTypePropSet = propSet.map['Item/Type'];        
        const ifcTypeExclude = new Set(['File', 'Representation', 'Line', 'Curve',  'Area', 'Boolean', 'Geometry', 'Composite', 'Mapped', 'Site', 'Project', 'Storey'].map(v => v.toLowerCase()));

        if (itemTypePropSet) {
            let dbIds = itemTypePropSet
                .filter(item => {
                    let lowerCaseDisplayValue = item.displayValue.toLowerCase();
                    return !ifcTypeExclude.some(keyword => lowerCaseDisplayValue.includes(keyword)) && lowerCaseDisplayValue !== 'ifcbuilding';
                })
                .map(item => item.dbId);
            return dbIds;
        } else {
            console.warn('No Item/Type properties found');
            return [];
        }
    }

    async findNavisNodes(model) {
        let allNodes = this.getAllDbIds(model);        
        let propSet = await model.getPropertySetAsync(allNodes, {});
        const elementCategoryPropSet = propSet.map['Element/Category'];     
        const itemTypePropSet = propSet.map['Item/Type'];           

        if (elementCategoryPropSet) {
            let dbIds = elementCategoryPropSet.filter(item => item.displayValue !== '').map(item => item.dbId);
            return dbIds;
        } else if (itemTypePropSet) {
            return this.findIfcNodes(model);
        } else {
            console.warn('No Element/Category or Item/Type properties found');
            return [];
        }
    }

    async findRevitNodes(model) {
        return new Promise((resolve, reject) => {
            model.getObjectTree((tree) => {
                let leaves = [];
                tree.enumNodeChildren(tree.getRootId(), (dbid) => {
                    if (tree.getChildCount(dbid) === 0) {
                        leaves.push(dbid);
                    }
                }, true);
                resolve(leaves);
            }, reject);
        });
    }

    async findTargetNodes(model) {
        const fileType = this.getFileInfo(model, "inputFileType");

        switch (fileType) {
            case 'rvt':
                return this.findRevitNodes(model);
            case 'ifc':
                return this.findIfcNodes(model);
            default:
                return this.findNavisNodes(model);
        }
    }

    async setTargetNodesMapSingleModel(model) {
        const targetNodes = await this.findTargetNodes(model);
        this.targetNodesMap.set(model, targetNodes); // Store targetNodes in the Map
    }

    async setTargetNodesMapAllModels() {
        // Get all visible models
        const models = this.viewer.getAllModels();

        // Iterate over each model
        for (const model of models) {
            // Run your code for each model
            await this.setTargetNodesMapSingleModel(model);
        }
    }

    async findPropertyNames(model) {
        const dbids = await this.findTargetNodes(model);
        return new Promise((resolve, reject) => {
            if (dbids.length === 0) {
                resolve([]);
            } else {
                model.getPropertyDb().getPropertySet(dbids, {}, (results) => {
                    const propNames = Object.keys(results).filter(name => !name.startsWith('_'));
                    resolve(propNames);
                }, (err) => {
                    console.error("Error querying the Property Set:", err);
                    reject(err);
                });
            }
        });
    }

    createDbIdToFragIdMap(model) {
        // Get the instance tree
        const instanceTree = model.getData().instanceTree;

        // Get the fragId2dbId array
        const fragId2dbId = instanceTree.fragList.fragments.fragId2dbId;

        // Initialize the dbIdTofragId object
        const dbIdTofragId = {};

        // Iterate over the fragId2dbId array
        for (let fragId = 0; fragId < fragId2dbId.length; fragId++) {
            const dbId = fragId2dbId[fragId];

            // If the dbId does not exist in the dbIdTofragId object, create a new array for it
            if (!dbIdTofragId[dbId]) {
                dbIdTofragId[dbId] = [];
            }

            // Add the fragId to the array of fragIds for the dbId
            dbIdTofragId[dbId].push(fragId);
        }

        // console.log('---PolyCountExtension.js onGeometryLoaded dbIdTofragId:', dbIdTofragId);

        // Return the dbIdTofragId map
        return dbIdTofragId;
    }

    getFragmentsForSelection() {
        let modelToFragIdsMap = new Map();
        let aggregateSelection = this.viewer.getAggregateSelection();
        if (aggregateSelection.length > 0) {
            aggregateSelection.forEach(selection => {
                let currentModel = selection.model;
                let instanceTree = currentModel.getData().instanceTree;
                let fragIds = [];
                let selectedDbIds = selection.selection;
                selectedDbIds.forEach(dbId => {
                    instanceTree.enumNodeFragments(dbId, (fragId) => {
                        fragIds.push(fragId);
                    }, true);
                });
                modelToFragIdsMap.set(currentModel, fragIds);
            });
        }
        return modelToFragIdsMap;
    }

    createToolbarButton(buttonId, buttonIconUrl, buttonTooltip, buttonColor) {
        let group = this.viewer.toolbar.getControl('dashboard-toolbar-group');
        if (!group) {
            group = new Autodesk.Viewing.UI.ControlGroup('dashboard-toolbar-group');
            this.viewer.toolbar.addControl(group);
        }
        const button = new Autodesk.Viewing.UI.Button(buttonId);
        button.setToolTip(buttonTooltip);

        // Set the background color of the button
        button.container.style.backgroundColor = buttonColor; // use the buttonColor parameter

        group.addControl(button);
        const icon = button.container.querySelector('.adsk-button-icon');
        if (icon) {
            icon.style.backgroundImage = `url(${buttonIconUrl})`;
            icon.style.backgroundSize = `24px`;
            icon.style.backgroundRepeat = `no-repeat`;
            icon.style.backgroundPosition = `center`;
        }
        return button;
    }

    removeToolbarButton(button) {
        const group = this.viewer.toolbar.getControl('dashboard-toolbar-group');
        group.removeControl(button);
    }

    loadScript(url, namespace) {
        if (window[namespace] !== undefined) {
            return Promise.resolve();
        }
        return new Promise(function (resolve, reject) {
            const el = document.createElement('script');
            el.src = url;
            el.onload = resolve;
            el.onerror = reject;
            document.head.appendChild(el);
        });
    }

    loadStylesheet(url) {
        return new Promise(function (resolve, reject) {
            const el = document.createElement('link');
            el.rel = 'stylesheet';
            el.href = url;
            el.onload = resolve;
            el.onerror = reject;
            document.head.appendChild(el);
        });
    }

    // Define new event handler methods
    onEscape(ev) {
        // Handle escape event
        console.log('Escape event triggered');
    }

    onShow(ev) {
        // Handle show event
        console.log('Show event triggered');
    }

    onShowAll(ev) {
        // Handle show all event
        console.log('Show All event triggered');
    }

};