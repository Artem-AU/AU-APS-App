import { BaseExtension } from './BaseExtension.js';

export class SearchExtension extends BaseExtension {
    constructor(viewer, options) {
        super(viewer, options);
        this._onSearchClicked = () => this.onSearchClicked();
    }

    load() {
        super.load();
        document.getElementById("search").addEventListener("click", this._onSearchClicked);
        console.log('SearchExtension loaded.');
        return true;
    }

    unload() {
        super.unload();
        document.getElementById("search").removeEventListener("click", this._onSearchClicked);
        console.log('SearchExtension unloaded.');
        return true;
    }

    onSearchClicked() {
        this.viewer.search(
            document.getElementById("filter").value,
            function (dbIDs) {
                this.viewer.isolate(dbIDs);
                this.viewer.fitToView(dbIDs);
            }.bind(this)
        );
    }
}

Autodesk.Viewing.theExtensionManager.registerExtension('SearchExtension', SearchExtension);