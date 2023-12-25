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

    // findLeafNodes(model) {
    //     return new Promise(function (resolve, reject) {
    //         model.getObjectTree(function (tree) {
    //             let leaves = [];
    //             tree.enumNodeChildren(tree.getRootId(), function (dbid) {
    //                 if (tree.getChildCount(dbid) === 0) {
    //                     leaves.push(dbid);
    //                 }
    //             }, true /* recursively enumerate children's children as well */);
    //             resolve(leaves);
    //             console.log("---LEAF NODES LENGTH: " + leaves.length);
    //         }, reject);
    //     });
    // }

    // findTargetNodes(model) {
    //     const self = this;
    //     return new Promise(function (resolve, reject) {
    //         model.getObjectTree(function (tree) {
    //             let promises = [];
    //             tree.enumNodeChildren(tree.getRootId(), function (dbid) {
    //                 if (tree.getChildCount(dbid) === 0) {
    //                     promises.push(self.checkNodeAndParents(model, tree, dbid));
    //                 }
    //             }, true /* recursively enumerate children's children as well */);
    //             Promise.all(promises).then(dbids => {
    //                 resolve(dbids.filter(dbid => dbid !== null)); // filter out null values
    //             }).catch(reject);
    //         }, reject);
    //     });
    // }

    findNodes(model) {
        const self = this;
        return new Promise(function (resolve, reject) {
            model.getObjectTree(async function (tree) {
                const rootNodeId = tree.getRootId();
                const rootNodeName = tree.getNodeName(rootNodeId);
                let fileExtension = rootNodeName.split('.')[1];
                console.log(fileExtension); // Log the file extension to the console

                // Wait for the fileExtension to be set
                while(fileExtension === null) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }

                if (fileExtension === "rvt") {
                    let leaves = [];
                    tree.enumNodeChildren(tree.getRootId(), function (dbid) {
                        if (tree.getChildCount(dbid) === 0) {
                            leaves.push(dbid);
                        }
                    }, true /* recursively enumerate children's children as well */);
                    resolve(leaves);
                    console.log("---LEAF NODES LENGTH: " + leaves.length);
                } else {
                    let promises = [];
                    tree.enumNodeChildren(tree.getRootId(), function (dbid) {
                        if (tree.getChildCount(dbid) === 0) {
                            promises.push(self.checkNodeAndParents(model, tree, dbid));
                        }
                    }, true /* recursively enumerate children's children as well */);
                    Promise.all(promises).then(dbids => {
                        resolve(dbids.filter(dbid => dbid !== null)); // filter out null values
                    }).catch(reject);
                }
            }, reject);
        });
    }


    checkNodeAndParents(model, tree, dbid) {
        return new Promise((resolve, reject) => {
            model.getProperties2(dbid, (properties) => { // Use an arrow function here
                for (let i = 0; i < properties.properties.length; i++) {
                    let property = properties.properties[i];
                    if (property.displayName === 'Category' && property.displayValue !== '') {
                        // console.log("FOUND CATEGORY: " + property.displayValue);
                        // console.log(properties.properties);
                        resolve(dbid);
                        return; // return once the first 'Category' property is found
                    }
                }
                // If conditions are not met and the node is not one before the root, check the parent
                if (tree.getNodeParentId(dbid) !== tree.getRootId()) {
                    resolve(this.checkNodeAndParents(model, tree, tree.getNodeParentId(dbid)));
                } else {
                    resolve(null); // resolve with null if no 'Category' property is found
                }
            }, function(error) {
                console.error('Error retrieving properties:', error);
                reject(error);
            });
        });
    }



    async findPropertyNames(model) {
        // let fileExtension = null;

        // // Get the root node
        // model.getObjectTree(function (tree) {
        //     const rootNodeId = tree.getRootId();
        //     const rootNodeName = tree.getNodeName(rootNodeId);
        //     fileExtension = rootNodeName.split('.')[1];
        //     console.log(fileExtension); // Log the file extension to the console
        // });

        // // Wait for the fileExtension to be set
        // while(fileExtension === null) {
        //     await new Promise(resolve => setTimeout(resolve, 100));
        // }

        // let dbids;
        // if (fileExtension === "rvt") {
        //     dbids = await this.findLeafNodes(model);
        // } else {
        //     console.log("findTargetNodes")
        //     dbids = await this.findTargetNodes(model);
        // }

        let dbids = await this.findNodes(model);

        return new Promise(function (resolve, reject) {
            if (dbids.length === 0) {
                resolve([]);
            } else {
                model.getBulkProperties(dbids, {}, function (results) {
                    let propNames = new Set();
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
