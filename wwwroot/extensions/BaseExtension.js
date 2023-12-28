export class BaseExtension extends Autodesk.Viewing.Extension {
    constructor(viewer, options) {
        super(viewer, options);
        this._onObjectTreeCreated = (ev) => this.onModelLoaded(ev.model);
        this._onSelectionChanged = (ev) => this.onSelectionChanged(ev.model, ev.dbIdArray);
        this._onIsolationChanged = (ev) => this.onIsolationChanged(ev.model, ev.nodeIdArray);
        this.targetNodeCache = new Map();
        this.propertyNameCache = new Map();
    }

    load() {
        this.viewer.addEventListener(Autodesk.Viewing.OBJECT_TREE_CREATED_EVENT, this._onObjectTreeCreated);
        this.viewer.addEventListener(Autodesk.Viewing.SELECTION_CHANGED_EVENT, this._onSelectionChanged);
        this.viewer.addEventListener(Autodesk.Viewing.ISOLATE_EVENT, this._onIsolationChanged);
        return true;
    }

    unload() {
        this.viewer.removeEventListener(Autodesk.Viewing.OBJECT_TREE_CREATED_EVENT, this._onObjectTreeCreated);
        this.viewer.removeEventListener(Autodesk.Viewing.SELECTION_CHANGED_EVENT, this._onSelectionChanged);
        this.viewer.removeEventListener(Autodesk.Viewing.ISOLATE_EVENT, this._onIsolationChanged);
        return true;
    }
    
    onModelLoaded(model) {}

    onSelectionChanged(model, dbids) {}

    onIsolationChanged(model, dbids) {}


    async findTargetNodes(model) {
        const doc = model.getDocumentNode().getDocument();
        const rootChildData = doc.getRoot().data.children[0];
        const fileName = rootChildData.name;
        const fileType = rootChildData.inputFileType;
        const ifcTypeExcludeSet = new Set(['Representation', 'Line', 'Curve',  'Area', 'Boolean', 'Geometry', 'Composite', 'Mapped', 'Site', 'Project']);

        if (this.targetNodeCache.has(fileName)) {
            return this.targetNodeCache.get(fileName);
        }

        const result = await new Promise(function (resolve, reject) {
            model.getObjectTree(async function (tree) {
                const dbids = [];
                const leafDbids = [];
                tree.enumNodeChildren(tree.getRootId(), function (dbid) {
                    dbids.push(dbid);
                    if (tree.getChildCount(dbid) === 0) {
                        leafDbids.push(dbid);
                    }
                }, true );

                if (fileType === "rvt") {
                    resolve(leafDbids);
                } else {
                    const results = await new Promise((resolve, reject) => {
                        model.getBulkProperties(dbids, {}, resolve, reject);
                    });

                    let validDbids = [];

                    for (const result of results) {
                        for (let property of result.properties) {
                            if (fileType === "ifc") {
                                if (property.displayCategory === 'Item' && property.displayName === 'Type' && !ifcTypeExcludeSet.has(property.displayValue.toLowerCase())) {
                                    validDbids.push(result.dbId);
                                    break;
                                }
                            } else {
                                if (property.displayName === 'Category' && property.displayValue !== '') {
                                    validDbids.push(result.dbId);
                                    break;
                                }
                            }
                        }
                    }

                    // Filter out dbids that are parents of any other dbid in validDbids
                    validDbids = validDbids.filter(dbid => !validDbids.some(otherDbid => tree.getNodeParentId(otherDbid) === dbid));

                    // Return the dbids that passed the check
                    resolve(validDbids.filter(dbid => dbid !== null)); // filter out null values
                }
            }, reject);
        });

        this.targetNodeCache.set(fileName, result);
        return result;
    }

    async findPropertyNames(model) {
        const doc = model.getDocumentNode().getDocument();
        const rootChildData = doc.getRoot().data.children[0];
        const fileName = rootChildData.name;

        if (this.propertyNameCache.has(fileName)) {
            return this.propertyNameCache.get(fileName);
        }

        const dbids = await this.findTargetNodes(model);

        const result = await new Promise(function (resolve, reject) {
            if (dbids.length === 0) {
                resolve([]);
            } else {
                model.getBulkProperties(dbids, {}, (results) => {
                    const propNames = new Set();
                    for (const result of results) {
                        for (const prop of result.properties) {
                            if (!prop.displayCategory.startsWith('_')) {
                                propNames.add(prop.displayCategory + '.' + prop.displayName);
                            }
                        }
                    }
                    resolve(Array.from(propNames.values()));
                }, reject);
            }
        });

        this.propertyNameCache.set(fileName, result);
        return result;
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
};
