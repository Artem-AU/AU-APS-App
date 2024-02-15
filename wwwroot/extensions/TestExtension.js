import { BaseExtension } from './BaseExtension.js';
import { TestPanel } from './TestPanel.js';
import { loadModel } from '../viewer.js';  // Make sure the path is correct


class TestExtension extends BaseExtension {
    constructor(viewer, options) {
        super(viewer, options);
        console.log(this.viewer); // This will log the viewer instance

    }

    load() {
        super.load();
        console.log('TestExtension loaded.');
        return true;
    }

    unload() {
        super.unload();
        if (this._button) {
            this.removeToolbarButton(this._button);
            this._button = null;
        }
        if (this._panel) {
            this._panel.setVisible(false);
            this._panel.uninitialize();
            this._panel = null;
        }
        console.log('TestExtension unloaded.');
        return true;
    }


    onToolbarCreated () {
        this._panel = new TestPanel(this, 'test-panel', 'Test Report', { x: 50, y: 100});
        this._button = this.createToolbarButton('test-button', 'https://cdn0.iconfinder.com/data/icons/phosphor-regular-vol-4/256/test-tube-64.png', 'Test', "red");
        this._button.onClick = () => {
            this._panel.setVisible(!this._panel.isVisible());
            this._button.setState(this._panel.isVisible() ? Autodesk.Viewing.UI.Button.State.ACTIVE : Autodesk.Viewing.UI.Button.State.INACTIVE);
            if (this._panel.isVisible() && this.viewer.model) {
                console.log("Should do something ");
                console.log('viewer:', this.viewer);

                // Viewer is initialized, now load the models
                // const models = [
                //     'dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6YXVfdW5pcXVlX2J1Y2tldC9zbWFsbC5pZmM',
                // "dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6YXVfdW5pcXVlX2J1Y2tldC9TVF9iYXNpY19zYW1wbGVfcHJvamVjdC5ud2M"
                // ];  // replace with your model URNs
                // const tasks = models.map(urn => loadModel(this.viewer, urn));
                // Promise.all(tasks)
                //     .then(bubbles => {
                //         bubbles.forEach(bubble => {
                //             this.viewer.loadDocumentNode(bubble.getDocument(), bubble);
                //         });
                //     })
                //     .catch(error => console.error('Failed to load models:', error));
    
            }
        };
    }

    async onModelLoaded(model) { 
        super.onModelLoaded(model);

        console.log('this in onModelLoaded:', this);  // Log the this object in onModelLoaded

    }    
}



Autodesk.Viewing.theExtensionManager.registerExtension('TestExtension', TestExtension);