export class BaseExtension extends Autodesk.Viewing.Extension {
    constructor(viewer, options) {
        super(viewer, options);
        this._onObjectTreeCreated = (ev) => this.onModelLoaded(ev.model);
        this._onSelectionChanged = (ev) => this.onSelectionChanged(ev.model, ev.dbIdArray);
        this._onIsolationChanged = (ev) => this.onIsolationChanged(ev.model, ev.nodeIdArray);
        this._onGeometryLoaded = (ev) => this.onGeometryLoaded(ev.model);
        this.ifcTypeExclude = new Set(['File', 'Representation', 'Line', 'Curve',  'Area', 'Boolean', 'Geometry', 'Composite', 'Mapped', 'Site', 'Project', 'Building', 'Storey'].map(v => v.toLowerCase()));

    }

    load() {
        this.viewer.addEventListener(Autodesk.Viewing.OBJECT_TREE_CREATED_EVENT, this._onObjectTreeCreated);
        this.viewer.addEventListener(Autodesk.Viewing.SELECTION_CHANGED_EVENT, this._onSelectionChanged);
        this.viewer.addEventListener(Autodesk.Viewing.ISOLATE_EVENT, this._onIsolationChanged);
        this.viewer.addEventListener(Autodesk.Viewing.GEOMETRY_LOADED_EVENT, this._onGeometryLoaded);
        return true;
    }

    unload() {
        this.viewer.removeEventListener(Autodesk.Viewing.OBJECT_TREE_CREATED_EVENT, this._onObjectTreeCreated);
        this.viewer.removeEventListener(Autodesk.Viewing.SELECTION_CHANGED_EVENT, this._onSelectionChanged);
        this.viewer.removeEventListener(Autodesk.Viewing.ISOLATE_EVENT, this._onIsolationChanged);
        this.viewer.removeEventListener(Autodesk.Viewing.GEOMETRY_LOADED_EVENT, this._onGeometryLoaded);
        return true;
    }
    
    onModelLoaded(model) {}

    onSelectionChanged(model, dbids) {}

    onIsolationChanged(model, dbids) {}

    onGeometryLoaded(model) {}

    getFileInfo(model, property) {
        const doc = model.getDocumentNode().getDocument();
        const data = doc.getRoot().data.children[0];
        return data.hasOwnProperty(property) ? data[property] : null;
    }

    getAllDbIds() {
        return new Promise((resolve, reject) => {
            this.viewer.model.getObjectTree(tree => {
                let allDbIds = [];
                tree.enumNodeChildren(tree.getRootId(), function(dbId) {
                    allDbIds.push(dbId);
                }, true);
                resolve(allDbIds);
            }, function(err) {
                console.error("Error querying the Object Tree:", err);
                reject(err);
            });
        });
    }

    async findIfcNodes(targetNodes = null, options = {}) {
        // console.log('---findIfcNodes');
        if (targetNodes === null) {
            targetNodes = await this.getAllDbIds();
        }
        return new Promise((resolve, reject) => {            
            this.viewer.model.getPropertyDb().getPropertySet(targetNodes, options, function(results) {
                if (results.hasOwnProperty('Item/Type')) {
                    let dbIds = results['Item/Type'].filter(item => !this.ifcTypeExclude.some(keyword => item.displayValue.toLowerCase().includes(keyword.toLowerCase()))).map(item => item.dbId);
                    resolve(dbIds);
                } else {
                    resolve([]);
                }
            }.bind(this), function(err) {
                console.error("Error querying the Property Set:", err);
                reject(err);
            });
        });
    }

    async findNavisNodes(targetNodes = null, options = {}) {
        // console.log('---findNavisNodes');
        if (targetNodes === null) {
            targetNodes = await this.getAllDbIds();
        }    
        return new Promise((resolve, reject) => {
            this.viewer.model.getPropertyDb().getPropertySet(targetNodes, options, (results) => {
                if (results.hasOwnProperty('Element/Category')) {
                    let dbIds = results['Element/Category'].filter(item => item.displayValue !== '').map(item => item.dbId);
                    resolve(dbIds);
                } else {
                    resolve([]);
                }
            }, (err) => {
                console.error("Error querying the Property Set:", err);
                reject(err);
                throw err;
            });
        });
    }

    async findRevitNodes(model) {
        // console.log('---findRevitNodes');
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
                return this.findIfcNodes();
            default:
                return this.findNavisNodes();
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