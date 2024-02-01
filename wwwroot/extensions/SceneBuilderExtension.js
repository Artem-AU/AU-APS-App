import { BaseExtension } from './BaseExtension.js';

class SceneBuilderExtension extends BaseExtension {
    constructor(viewer, options) {
        super(viewer, options);
        this.modelBuilder = null;
    }

    load() {
        super.load();
        console.log('SceneBuilderExtension loaded.');
        // this.viewer.loadExtension('Autodesk.Viewing.SceneBuilder').then((sceneBuilderExtension) => {
        //     console.log('Autodesk.Viewing.SceneBuilder loaded:', sceneBuilderExtension);
        // });
        return true;
    }

    unload() {
        super.unload();
        console.log('SceneBuilderExtension unloaded.');
        if (this.modelBuilder) {
            this.viewer.impl.unloadModel(this.modelBuilder.model);
            this.modelBuilder = null;
        }
        return true;
    }

    onExtensionLoaded(extensionId) {
        console.log('onExtensionLoaded:', extensionId);
        if (extensionId === 'Autodesk.Viewing.SceneBuilder') {
            const sceneBuilderExtension = this.viewer.getExtension('Autodesk.Viewing.SceneBuilder');
            console.log('sceneBuilderExtension:', sceneBuilderExtension);
            if (sceneBuilderExtension) {
                sceneBuilderExtension.addNewModel({ conserveMemory: true, createWireFrame: false }).then((modelBuilder) => {
                    this.modelBuilder = modelBuilder;
                    console.log('modelBuilder:', modelBuilder);
                    // Now you can use modelBuilder to add custom geometry...
                });
            }
        }
    }
}

Autodesk.Viewing.theExtensionManager.registerExtension('SceneBuilderExtension', SceneBuilderExtension);