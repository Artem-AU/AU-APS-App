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


        // console.log(THREE); // Logs the version of THREE.js
        // console.log(THREE.REVISION); // Logs the version of THREE.js
        // console.log(THREE.FontLoader); // Logs the FontLoader class if it's available
        // console.log("THREE.FontUtils.faces", THREE.FontUtils.faces);


        // // Define the text to search for
        // const searchText = [
        //     "7a444699-c195-59bf-857e-9c9d97fc9fa7",
        //     "d764a5ab-d38c-5ada-b1cf-25a4402bbc5d",
        //     "f1441bdf-33d1-5c39-ab6c-5ec68400afa5",
        //     "4dfa23c3-dfde-5f80-8176-fe05bcebf613",
        //     "7bb5f748-3242-55b2-a1de-c301f002e3b3",
        //     "cd41276e-fd6a-5e55-95e5-32134c439f6f",
        //     "02ed1db9-88df-52ee-b82d-7b4ec9917019",
        //     "fbcc9ec9-c101-56c5-a06a-2f08c1e7a338",
        //     "e05d6ce6-4a71-5cf7-88cf-e1438011ac02",
        //     "81aab14f-f715-5c4a-a254-3dcf54d51193",
        //     "4040fd0a-6a0c-587f-a8bb-4bbcbef6307b",
        //     "48f01d3e-68c9-5fed-ba40-b615e5fa2aca",
        //     "15f4adab-dd43-54a0-a3ff-b840a423dd6d",
        //     "b2692932-0d19-55c6-82a5-dd48f0a8f5c0",
        //     "1cb1bad6-800c-55df-a4d3-60666e56e8d8",
        //     "52ad4503-3f4a-5e82-947c-5a87f979ffba",
        //     "2053c0be-5012-5f5e-862c-74e804518ff4",
        //     "c9576e6b-a684-5e21-8ce1-6718e84e23db",
        //     "893db956-ede3-53a3-919b-28584f74d187"
        // ];

        // // Define the onSuccessCallback function
        // const onSuccessCallback = (dbIds) => {
        //     console.log("Search results:", dbIds);
        // };

        // // Define the onErrorCallback function
        // const onErrorCallback = (error) => {
        //     console.error("Search error:", error);
        // };

        // // Run the search for each value
        // searchText.forEach((text) => {
        //     this.viewer.model.search(text, onSuccessCallback, onErrorCallback);
        // });
        

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