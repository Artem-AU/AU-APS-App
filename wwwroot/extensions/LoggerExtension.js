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

        // // Get the instance of the LevelsExtension
        // let levelsExtension = this.viewer.getExtension('Autodesk.AEC.LevelsExtension');
        // console.log('---LoggerExtension.js onModelLoaded levelsExtension:', levelsExtension);

        // // Iterate over all levels
        // for (let levelIndex = 0; levelIndex < levelsExtension.aecModelData.levels.length; levelIndex++) {
        //     let zRange = levelsExtension.getZRange(levelIndex);
        //     // console.log(`Z range of level ${levelIndex}:`, zRange);
        // }
    }

    onModelUnloaded(model) {
        super.onModelUnloaded(model);
        console.log('---LoggerExtension.js onModelUnloaded targetNodesMap:', this.targetNodesMap);       
    }

    onSelectionChanged(model, dbids) {
        super.onSelectionChanged(model, dbids);

        // let modelToFragIdsMap = this.getFragmentsForSelection();
        // console.log("--- getFragmentsForModels:", modelToFragIdsMap);
    }

    onIsolationChanged(model, dbids) {
        super.onIsolationChanged(model, dbids);
        console.log('Isolation has changed', dbids);
    }
}

Autodesk.Viewing.theExtensionManager.registerExtension('LoggerExtension', LoggerExtension);