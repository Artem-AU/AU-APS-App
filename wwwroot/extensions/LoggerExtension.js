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
        
        const props = await this.findPropertyNames(this.viewer.model);
        console.log('New model has been loaded. Its objects contain the following properties:', props);

        // const targetNodes = await this.findNodes(this.viewer.model);
        // // console.log('---TARGET NODES:', targetNodes);

        // // Log each target node
        // targetNodes.forEach((nodeId, index) => {
        //     const instanceTree = this.viewer.model.getInstanceTree();
        //     const nodeName = instanceTree.getNodeName(nodeId);
            
        //     const parentId = instanceTree.getNodeParentId(nodeId);
        //     const parentParentId = instanceTree.getNodeParentId(parentId);
        //     const parentName = instanceTree.getNodeName(parentParentId);

        //     // console.log(`---TARGET NODE ${index}:`, nodeName);
        //     console.log(`---PARENT OF TARGET NODE ${index}:`, parentName);
        // });
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