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
        console.log('New model has been loaded. Its objects contain the following properties:', props);
        //log total number of values, target nodes length * props length, represented in millions
        console.log('Total number of property values:', targetNodes.length * props.length / 1000000, 'millions');
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