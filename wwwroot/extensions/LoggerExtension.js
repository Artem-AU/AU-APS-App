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

        // const newProps = await this.findPropertyNamesNew(this.viewer.model);
        // console.log('New model has been loaded. Its objects contain the following NEW properties:', newProps);

        // // Create new array that contains only the parts of the property names after the "."
        // const propsAfterDot = props.map(prop => prop.split('.')[1]);

        // // Find the properties that are in propsAfterDot but not in newProps
        // const difference = propsAfterDot.filter(prop => !newProps.includes(prop));

        // console.log('The following properties are in props but not in newProps:', difference);



        const targetNodes = await this.findTargetNodes(this.viewer.model);
        console.log('---TARGET NODES:', targetNodes);

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