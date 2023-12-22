export class BaseExtension extends Autodesk.Viewing.Extension {
    constructor(viewer, options) {
        super(viewer, options);
        this._onObjectTreeCreated = (ev) => this.onModelLoaded(ev.model);
        this._onSelectionChanged = (ev) => this.onSelectionChanged(ev.model, ev.dbIdArray);
        this._onIsolationChanged = (ev) => this.onIsolationChanged(ev.model, ev.nodeIdArray);

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

    findLeafNodes(model) {
        return new Promise(function (resolve, reject) {
            model.getObjectTree(function (tree) {
                let leaves = [];

                function checkParent(nodeId) {
                    const parentNodeId = tree.getNodeParentId(nodeId);
                    if (parentNodeId === null) {
                        return nodeId;
                    }
                    const parentName = tree.getNodeName(parentNodeId);
                    if (parentName === 'Body' || parentName === 'Axis') {
                        return checkParent(parentNodeId);
                    } else {
                        return parentNodeId;
                    }
                }

                tree.enumNodeChildren(tree.getRootId(), function (dbid) {
                    const nodeName = tree.getNodeName(dbid);
                    if (nodeName === 'Body' || nodeName === 'Axis') {
                        const nodeIdToPush = checkParent(dbid);
                        leaves.push(nodeIdToPush);
                    } else {
                        leaves.push(dbid);
                    }
                }, true /* recursively enumerate children's children as well */);

                resolve(leaves);
                // log the length of the array of leaf nodes
                console.log("LEAF NODES LENGTH: " + leaves.length);
            }, reject);
        });
    }
    // findFirstObject(viewer, x, y) {
    //     return new Promise(function (resolve, reject) {
    //         const hitTestResult = viewer.impl.hitTest(x, y, true);
    //         if (hitTestResult) {
    //             resolve(hitTestResult.dbId);
    //             console.log("HIT TEST RESULT: " + hitTestResult);
    //         } else {
    //             reject('No object found at the clicked pixel');
    //         }
    //     });
    // }

    // findParentChildPairs(model) {
    //     return new Promise(function (resolve, reject) {
    //         model.getObjectTree(function (tree) {
    //             let pairs = [];
    //             tree.enumNodeChildren(tree.getRootId(), function (dbid) {
    //                 if (tree.getChildCount(dbid) === 0) {
    //                     const parentId = tree.getNodeParentId(dbid);
    //                     pairs.push({ parent: parentId, child: dbid });
    //                 }
    //             }, true);
    //             resolve(pairs);
    //             console.log("PARENT-CHILD PAIRS LENGTH: " + pairs.length);
    //         }, reject);
    //     });
    // }

    async findPropertyNames(model) {
        const dbids = await this.findLeafNodes(model);
        return new Promise(function (resolve, reject) {
            model.getBulkProperties(dbids, {}, function (results) {
                let propNames = new Set();
                for (const result of results) {
                    for (const prop of result.properties) {
                        propNames.add(prop.displayName);
                    }
                }
                resolve(Array.from(propNames.values()));
                // log the length of the array of property names
                console.log("PROP NAMES LENGTH: " + propNames.length);
            }, reject);
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
