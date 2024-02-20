/// import * as Autodesk from "@types/forge-viewer";
import './extensions/LoggerExtension.js';
import './extensions/SummaryExtension.js';
import './extensions/HistogramExtension.js';
import './extensions/DataGridExtension.js';
import './extensions/ReconstructPropsExtension.js';
import './extensions/SearchExtension.js';
import './extensions/PolyCountExtension.js';
import './extensions/BulkPropertiesExtension.js';
import './extensions/SceneBuilderExtension.js';



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
        Autodesk.Viewing.Initializer({ env: 'AutodeskProduction', getAccessToken }, function () {
            const config = {
                extensions: [
                    'Autodesk.DocumentBrowser',
                    // "Autodesk.Viewing.SceneBuilder",   THIS CREATES ERRORS WITH BASE EXTENSION READING model. I ASSUME THE MULTIPLE MODELS CREATED, INVESTIGATE
                    'Autodesk.Explode',
                    'LoggerExtension',
                    // 'SummaryExtension',
                    'HistogramExtension',
                    // 'DataGridExtension',
                    // 'ReconstructPropsExtension',
                    'BulkPropertiesExtension',
                    'SearchExtension',
                    'PolyCountExtension',
                    // 'TestExtension',
                    // "SceneBuilderExtension",
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
            // console.log('Loaded Forge model:', doc);
            const data = doc.getRoot().data.children[0];
            const fileType = data.inputFileType;
            // console.log('---fileType:', fileType);

            if (fileType !== 'rvt') {
                viewer.setSelectionMode(1);
            } else {
                // console.log('---file extension:', fileExtension);
                viewer.setSelectionMode(0);
            }

            resolve(viewer.loadDocumentNode(doc, doc.getRoot().getDefaultGeometry()));
        }
        function onDocumentLoadFailure(code, message, errors) {
            reject({ code, message, errors });
        }
        Autodesk.Viewing.Document.load('urn:' + urn, onDocumentLoadSuccess, onDocumentLoadFailure);
    });
}