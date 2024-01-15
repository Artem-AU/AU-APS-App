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

        const fileName = this.getFileInfo(model, "name");
        console.log('File name:', fileName);
        const fileType = this.getFileInfo(model, "inputFileType");
        console.log('File type:', fileType);

        // //getDocumentNode()
        // console.log('Document node:', model.getDocumentNode().getRoot());


        // console.log('New model has been loaded. Its objects contain the following properties:', props);
        //log total number of values, target nodes length * props length, represented in millions
        // console.log('Total number of property values:', targetNodes.length * props.length / 1000000, 'millions');

        
        // Log the polygon counts
        // console.log('Geometry polygon count:', model.geomPolyCount());
        // console.log('Instance polygon count:', model.instancePolyCount());



        // Get the viewer instance
        const viewer = this.viewer;

        // Iterate over each dbId
        for (const dbId of targetNodes) {
            let totalTriCount = 0;

            // Get the fragment IDs for each dbId
            viewer.model.getData().instanceTree.enumNodeFragments(dbId, function (fragId) {
                // console.log('Fragment ID:', fragId);
                // Get the triangle count for each fragment
                const renderProxy = viewer.impl.getRenderProxy(viewer.model, fragId);
                // console.log('dbid:', dbId);
                // console.log('Render proxy:', renderProxy);

                if (renderProxy && renderProxy.geometry) {
                    const polyCount = renderProxy.geometry.polyCount;
                    totalTriCount += polyCount;
                }
            }, true);

            // // Get the properties of the node
            // viewer.model.getProperties(dbId, function(props) {
            //     // console.log('Properties:', props);
            //     // Log the triangle count along with the node name
            //     // console.log('Triangle count for node ' + props.name + ' (dbId ' + dbId + '): ' + totalTriCount);
            // });
        }
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