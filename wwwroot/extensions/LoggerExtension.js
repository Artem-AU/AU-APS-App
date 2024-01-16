import { BaseExtension } from './BaseExtension.js';

class LoggerExtension extends BaseExtension {
    
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
        super.onModelLoaded(model);
        const targetNodes = await this.findTargetNodes(model);       
        const props = await this.findPropertyNames(model);
        console.log('Target nodes:', targetNodes);
        console.log('Properties:', props);

        const fileName = this.getFileInfo(model, "name");
        console.log('File name:', fileName);
        const fileType = this.getFileInfo(model, "inputFileType");
        console.log('File type:', fileType);

    }

    async onSelectionChanged(model, dbids) {
        super.onSelectionChanged(model, dbids);
        console.log('Selection has changed', dbids);
    }

    onIsolationChanged(model, dbids) {
        super.onIsolationChanged(model, dbids);
        console.log('Isolation has changed', dbids);
    }
}

Autodesk.Viewing.theExtensionManager.registerExtension('LoggerExtension', LoggerExtension);