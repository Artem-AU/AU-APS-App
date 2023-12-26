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
        
        // Get the doc object from the model
        // const doc = model.getDocumentNode().getDocument();

        const props = await this.findPropertyNames(this.viewer.model);
        console.log('New model has been loaded. Its objects contain the following properties:', props);

        const leafNodes = await this.findNodes(this.viewer.model);
        console.log('Leaf nodes with Category property:', leafNodes);
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