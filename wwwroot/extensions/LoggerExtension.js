import { BaseExtension } from './BaseExtension.js';

class LoggerExtension extends BaseExtension {
    constructor(viewer, options) {
        super(viewer, options);
    }
    
    load() {
        super.load();
        console.log('LoggerExtension loaded.');
        return true;
    }

    unload() {
        super.unload();
        console.log('LoggerExtension unloaded.');
        return true;
    }

    async onModelLoaded(model) {
        await super.onModelLoaded(model);
        console.log('---LoggerExtension.js onModelLoaded targetNodesMap:', this.targetNodesMap);
    }

    onModelUnloaded(model) {
        super.onModelUnloaded(model);
        console.log('---LoggerExtension.js onModelUnloaded targetNodesMap:', this.targetNodesMap);
    }

    async onSelectionChanged(model, dbids) {
        super.onSelectionChanged(model, dbids);
        console.log('Selection has changed', dbids);
        // console.log('Logger onSelectionChanged Target nodes:', this.targetNodesMap);

    }

    onIsolationChanged(model, dbids) {
        super.onIsolationChanged(model, dbids);
        console.log('Isolation has changed', dbids);
    }
}

Autodesk.Viewing.theExtensionManager.registerExtension('LoggerExtension', LoggerExtension);