/// import * as Autodesk from "@types/forge-viewer";
import './extensions/LoggerExtension.js';
// import './extensions/SummaryExtension.js';
// import './extensions/HistogramExtension.js';
// import './extensions/DataGridExtension.js';
// import './extensions/ReconstructPropsExtension.js';
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
                    // 'SummaryExtension',
                    // 'HistogramExtension',
                    // 'DataGridExtension',
                    // 'ReconstructPropsExtension',
                    'ExportPropsExtension'
                ]
            };
            const viewer = new Autodesk.Viewing.GuiViewer3D(container, config);
            viewer.start();
            viewer.setTheme('dark-theme');

            resolve(viewer);
        });
    });
}

export function loadModel(viewer, urn) {
    return new Promise(function (resolve, reject) {
        function onDocumentLoadSuccess(doc) {
            const data = doc.getRoot().data;
            if (data.children && data.children.length > 0) {
                const fileName = data.children[0].name;
                const fileExtension = fileName.split('.').pop();

                if (fileExtension === 'nwc' || fileExtension === 'nwd') {
                    viewer.setSelectionMode(1);
                } else {
                    viewer.setSelectionMode(0);
                }
            } else {
                console.log('No file name found in the loaded document');
            }
            resolve(viewer.loadDocumentNode(doc, doc.getRoot().getDefaultGeometry()));
        }
        function onDocumentLoadFailure(code, message, errors) {
            reject({ code, message, errors });
        }
        Autodesk.Viewing.Document.load('urn:' + urn, onDocumentLoadSuccess, onDocumentLoadFailure);
    });
}