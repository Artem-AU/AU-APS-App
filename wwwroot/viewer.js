/// import * as Autodesk from "@types/forge-viewer";
import './extensions/LoggerExtension.js';
import './extensions/SummaryExtension.js';
import './extensions/HistogramExtension.js';
import './extensions/DataGridExtension.js';
import './extensions/ReconstructPropsExtension.js';
import './extensions/ExportPropsExtension.js';



async function getAccessToken(callback) {
    try {
        const resp = await fetch('/api/auth/token');
        if (!resp.ok) {
            throw new Error(await resp.text());
        }
        const { access_token, expires_in } = await resp.json();
        callback(access_token, expires_in);
    } catch (err) {
        alert('Could not obtain access token. See the console for more details.');
        console.error(err);
    }
}

export function initViewer(container) {
    return new Promise(function (resolve, reject) {
        Autodesk.Viewing.Initializer({ getAccessToken }, function () {
            const config = {
                extensions: [
                    'Autodesk.DocumentBrowser',
                    'Autodesk.Explode',
                    'LoggerExtension',
                    'SummaryExtension',
                    'HistogramExtension',
                    'DataGridExtension',
                    'ReconstructPropsExtension',
                    'ExportPropsExtension'
                ]
            };
            const viewer = new Autodesk.Viewing.GuiViewer3D(container, config);
            viewer.start();
            viewer.setTheme('dark-theme');

            // viewer.addEventListener(Autodesk.Viewing.MODEL_ROOT_LOADED_EVENT, function() {
            //     const explodeExtension = viewer.getExtension('Autodesk.Explode');
            //     if (explodeExtension) {
            //         explodeExtension.setStrategy('hierarchy');
            //     }
            // });
            resolve(viewer);
        });
    });
}

export function loadModel(viewer, urn) {
    return new Promise(function (resolve, reject) {
        function onDocumentLoadSuccess(doc) {
            resolve(viewer.loadDocumentNode(doc, doc.getRoot().getDefaultGeometry()));
        }
        function onDocumentLoadFailure(code, message, errors) {
            reject({ code, message, errors });
        }
        viewer.setLightPreset(17);
        Autodesk.Viewing.Document.load('urn:' + urn, onDocumentLoadSuccess, onDocumentLoadFailure);
    });
}
