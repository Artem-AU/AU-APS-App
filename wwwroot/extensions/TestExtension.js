import { BaseExtension } from "./BaseExtension.js";

class TestExtension extends Autodesk.Viewing.Extension {
    constructor(viewer, options) {
        super(viewer, options);
        this._viewer = viewer;
        this._options = options;
    }

    load() {
        console.log('TestExtension loaded.');
        const splitScreenOptions = {
            viewports: [ 
                function(id) { return true; }, 
                function(id) { return true; },
                function(id) { return true; },
                function(id) { return true; }
            ]
        };

        this._viewer.loadExtension('Autodesk.SplitScreen', splitScreenOptions).then(() => {
            const cameras = this._viewer.getExtension('Autodesk.SplitScreen').getCameras();

            // Adjust the camera settings for each viewport
            cameras[0].setPosition(new THREE.Vector3(10, 10, 10));
            cameras[1].setPosition(new THREE.Vector3(-10, -10, -10));
            cameras[2].setPosition(new THREE.Vector3(10, -10, 10));
            cameras[3].setPosition(new THREE.Vector3(-10, 10, -10));

            // Update the viewer to apply the new camera settings
            this._viewer.impl.invalidate(true);
        });

        return true;
    }

    unload() {
        super.unload();
        console.log('TestExtension unloaded.');
        this._viewer.unloadExtension('Autodesk.SplitScreen');
        return true;
    }

    onModelLoaded(model) {
        super.onModelLoaded(model);

        const dbIds = [7, 14, 16];
        
        console.log('---New model has been loaded.');

        model.getPropertySet(dbIds, 
            function(propertySet) {
                // This function is called when the request succeeds
                propertySet.forEach((name, properties) => {
                    const commonValues = propertySet.getValue2PropertiesMap(name);
                    console.log('---name:', name);
                    console.log('---commonValues:', commonValues);
                  });
                console.log('Property set:', propertySet);
            },
            function(error) {
                // This function is called when the request fails
                console.error('Error retrieving property set:', error);
            },
            {
                // Options go here
            }
        );
        // const query = model.isObjectTreeLoaded()

        
        // console.log('---query:', propertySet);
    }


    onGeometryLoaded(model) {
        super.onGeometryLoaded(model);
        console.log('---Geometry has been loaded.');

        // const query = model.instancePolyCount();
        
        
        // console.log('---query:', query);
    }
        
}

Autodesk.Viewing.theExtensionManager.registerExtension('TestExtension', TestExtension);