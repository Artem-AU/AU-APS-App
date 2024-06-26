import { initViewer, loadModel } from './viewer.js';

initViewer(document.getElementById('preview')).then(aggregatedView => {
    // console.log(LMV_VIEWER_VERSION); // Logs the value of LMV_VIEWER_VERSION to the console
   
   
    // const urn = "dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6YXVfdW5pcXVlX2J1Y2tldC9NSF9WQl9QRFNfMTgwNl9TUkwtV1BDLVNDQy1STU5TLU1PRC1DU0ItTVNILTUxMDAwMS5ud2Q";
    // // Load the model with the hardcoded URN
    // loadModel(aggregatedView, urn).then(bubble => {
    //     console.log('Model loaded successfully', bubble);
    //     // Assuming aggregatedView has a method setNodes to set the current nodes
    //     aggregatedView.setNodes([bubble]).then(() => {
    //         console.log('Nodes set successfully');
    //         // Proceed with any further operations after setting the nodes
    //     }).catch(error => {
    //         console.error('Failed to set nodes:', error);
    //     });
    // }).catch(error => {
    //     console.error('Failed to load model:', error);
    // });

    

    aggregatedView.setNodes([]);

    setupModelSelection(aggregatedView);
    // setupModelSelection(aggregatedView, urn);
    setupModelUpload(aggregatedView);

    // Get the UI element
    const uiElement = document.getElementById('BulkPropertiesExtension');
    // console.log('---main.js uiElement:', uiElement);
    // console.log('---main.js aggregatedView:', aggregatedView.viewer);

    
    // Get the parent element
    const parentElement = document.querySelector('.offcanvas-body');


    // Add an event listener to the parent element
    parentElement.addEventListener('change', function(event) {
        // Check if the target element is a checkbox
        if (event.target.type === 'checkbox') {
            // Get the Viewer3D instance from aggregatedView
            const viewer3D = aggregatedView.viewer;

            if (event.target.checked) {
                // Load the extension when the checkbox is checked
                viewer3D.loadExtension(event.target.id);
            } else {
                // Unload the extension when the checkbox is unchecked
                viewer3D.unloadExtension(event.target.id);
            }
        }
    });




}).catch(error => {
    console.error('Failed to initialize aggregatedView:', error);
});

async function setupModelSelection(aggregatedView) {
    const dropdown = document.getElementById('models');
    dropdown.innerHTML = '';
    try {
        const resp = await fetch('/api/models');
        if (!resp.ok) {
            throw new Error(await resp.text());
        }
        const models = await resp.json();
        dropdown.innerHTML = models.map(model => `<option value=${model.urn}>${model.name}</option>`).join('\n');        
        // Initialize Select2 on the dropdown
        $(dropdown).select2({
            placeholder: 'Select Model...', // Add a placeholder
        });
        dropdown.onchange = () => {
            const selectedModels = Array.from(dropdown.options)
                .filter(option => option.selected)
                .map(option => option.value);
            onModelSelected(aggregatedView, selectedModels); // Pass array of selected models
        };
        // if (dropdown.value) {
        //     onModelSelected(aggregatedView, [dropdown.value]); // Pass single selected model as an array
        // }
    } catch (err) {
        alert('Could not list models. See the console for more details.');
        console.error(err);
    }
}

async function setupModelUpload(aggregatedView) {
    const upload = document.getElementById('upload');
    const input = document.getElementById('input');
    const models = document.getElementById('models');
    upload.onclick = () => input.click();
    input.onchange = async () => {
        const file = input.files[0];
        let data = new FormData();
        data.append('model-file', file);
        if (file.name.endsWith('.zip')) { // When uploading a zip file, ask for the main design file in the archive
            const entrypoint = window.prompt('Please enter the filename of the main design inside the archive.');
            data.append('model-zip-entrypoint', entrypoint);
        }
        upload.setAttribute('disabled', 'true');
        models.setAttribute('disabled', 'true');
        showNotification(`Uploading model <em>${file.name}</em>. Do not reload the page.`);
        try {
            const resp = await fetch('/api/models', { method: 'POST', body: data });
            if (!resp.ok) {
                throw new Error(await resp.text());
            }
            const model = await resp.json();
            setupModelSelection(aggregatedView, model.urn);
        } catch (err) {
            alert(`Could not upload model ${file.name}. See the console for more details.`);
            console.error(err);
        } finally {
            clearNotification();
            upload.removeAttribute('disabled');
            models.removeAttribute('disabled');
            input.value = '';
        }
    };
}

async function onModelSelected(aggregatedView, urns) {
    if (window.onModelSelectedTimeout) {
        clearTimeout(window.onModelSelectedTimeout);
        delete window.onModelSelectedTimeout;
    }
    try {

        const existingUrns = Object.keys(aggregatedView.modelItems).map(urn => {
            const parts = urn.split('/');
            const subParts = parts[0].split(':');
            return subParts[subParts.length - 1];
        });
        const newUrns = urns.filter(urn => !existingUrns.includes(urn));

        // Find redundantUrns and unload them
        const redundantUrns = existingUrns.filter(urn => !urns.includes(urn));
        Object.keys(aggregatedView.modelItems).forEach(key => {
            redundantUrns.forEach(urn => {
                if (key.includes(urn)) {
                    const bubbleNode = aggregatedView.modelItems[key];
                    // console.log('---main.js onModelSelected redundantUrns:', urn, bubbleNode);
                    aggregatedView.unload(bubbleNode.node);
                }
            });
        });
                
        // If newUrns is empty, do nothing and return
        if (newUrns.length === 0) {
            return;
        }
        

        const tasks = urns.map(async urn => {
            window.location.hash = urn;

            // Check if the URN exists
            const resp = await fetch(`/api/models/${urn}/status`, { method: 'HEAD' });
            if (resp.ok) {
                // The URN exists, proceed with loading
                const statusResp = await fetch(`/api/models/${urn}/status`);
                if (!statusResp.ok) {
                    throw new Error(await statusResp.text());
                }
                const status = await statusResp.json();
                switch (status.status) {
                    case 'n/a':
                        showNotification(`Model has not been translated.`);
                        break;
                    case 'inprogress':
                        showNotification(`Model is being translated (${status.progress})...`);
                        window.onModelSelectedTimeout = setTimeout(onModelSelected, 5000, aggregatedView, [urn]);
                        break;
                    case 'failed':
                        showNotification(`Translation failed. <ul>${status.messages.map(msg => `<li>${JSON.stringify(msg)}</li>`).join('')}</ul>`);
                        break;
                    default:
                        clearNotification();
                        return loadModel(aggregatedView, urn);
                }
            } else {
                // The URN does not exist, throw an error or handle it appropriately
                console.error(`URN ${urn} does not exist`);
            }
        });
        const bubbles = await Promise.all(tasks);
        aggregatedView.setNodes(bubbles.filter(Boolean));
    } catch (err) {
        alert('Could not load model. See the console for more details.');
        console.error(err);
    }
}

function showNotification(message) {
    const overlay = document.getElementById('overlay');
    overlay.innerHTML = `<div class="notification">${message}</div>`;
    overlay.style.display = 'flex';
}

function clearNotification() {
    const overlay = document.getElementById('overlay');
    overlay.innerHTML = '';
    overlay.style.display = 'none';
}
