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
import './extensions/TestExtension.js';
// import './extensions/IddPipelineExtension.js';
import './extensions/QtyHistogramExtension.js';



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
        Autodesk.Viewing.Initializer({ env: 'AutodeskProduction', getAccessToken }, async function () {
            const options = {
                viewerConfig: {
                    extensions: [
                        'Autodesk.DocumentBrowser',
                        // "Autodesk.Viewing.SceneBuilder",   THIS CREATES ERRORS WITH BASE EXTENSION READING model. I ASSUME THE MULTIPLE MODELS CREATED, INVESTIGATE
                        'Autodesk.Explode',
                        'LoggerExtension',
                        // 'SummaryExtension',
                        // 'HistogramExtension',
                        // 'DataGridExtension',
                        // 'ReconstructPropsExtension',
                        // 'BulkPropertiesExtension',
                        // 'SearchExtension',
                        // 'PolyCountExtension',
                        'TestExtension',
                        // "SceneBuilderExtension",
                        // 'IddPipelineExtension',
                        // 'QtyHistogramExtension',
                    ]
                }
            };

            // Initialize the AggregatedView
            const aggregatedView = new Autodesk.Viewing.AggregatedView();
            console.log('---viewer.js initViewer Viewer:', aggregatedView);
            await aggregatedView.init(container, options);
            // viewer.setTheme('dark-theme');

            resolve(aggregatedView);
        });
    });
}

export function loadModel(aggregatedView, urn) {
    // console.log('---viewer.js loadModel aggregatedView:', aggregatedView);
    // console.log('---viewer.js loadModel urn:', urn);
    return new Promise(function (resolve, reject) {
        function onDocumentLoadSuccess(doc) {
            doc.downloadAecModelData(() => {
                const bubbles = doc.getRoot().search({type:'geometry', role: '3d'});
                const bubble = bubbles[0];
                if (!bubble) {
                    reject(new Error('No 3D geometry found in document'));
                } else {
                    resolve(bubble);
                }
            });
        }
        function onDocumentLoadFailure(code, message, errors) {
            reject({ code, message, errors });
        }
        Autodesk.Viewing.Document.load('urn:' + urn, onDocumentLoadSuccess, onDocumentLoadFailure);
    });
}