import { initViewer, loadModel } from './viewer.js';

initViewer(document.getElementById('preview')).then(aggregatedView => {

    // const urn = window.location.hash?.substring(1);
    // console.log('---main.js initViewer urn:', window.location);
    // if (!urn) {
    //     console.error('No URN provided in URL hash');
    //     return;
    // }

    // console.log('---main.js aggregatedView is initialized:', aggregatedView);
    // console.log('---main.js aggregatedView.viewer:', aggregatedView.viewer);
    
    // Viewer is initialized, now load the models
    // const models = [
    //     'dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6YXVfdW5pcXVlX2J1Y2tldC9zbWFsbC5pZmM',
    // "dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6YXVfdW5pcXVlX2J1Y2tldC9TVF9iYXNpY19zYW1wbGVfcHJvamVjdC5ud2M"
    // ];  // replace with your model URNs
    // const tasks = models.map(urn => loadModel(aggregatedView, urn));
    // console.log('---main.js initViewer loadModel:', tasks);
    // Promise.all(tasks)
    //     .then(bubbles => aggregatedView.setNodes(bubbles))
    //     .catch(error => console.error('Failed to load models:', error));

    // // Continue with your existing code...
    // const customProfileSettings = {
    //     settings: {
    //         reverseMouseZoomDir: true,
    //         wheelSetsPivot: true,
    //         lightPreset: 17, 
    //     }
    // };
    // const customProfile = new Autodesk.Viewing.Profile(customProfileSettings);
    // const viewModels = aggregatedView.getModels();
    // console.log('---main.js viewModels:', viewModels);
    // const urn = window.location.hash?.substring(1);

    // loadModel(aggregatedView, urn)
    //     .then(bubble => {
    //         console.log('---main.js init Viewer Model loaded:', urn, aggregatedView.modelItems);
    //         aggregatedView.setNodes([bubble]);
    //     })
    //     .catch(error => console.error('Failed to load model:', error));


    
    // console.log('---main.js initViewer modelItems:', aggregatedView.modelItems());

    aggregatedView.setNodes([]);

    setupModelSelection(aggregatedView);
    // setupModelSelection(aggregatedView, urn);
    setupModelUpload(aggregatedView);
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
            console.log('---main.js setupModelSelection onchange selectedModels:', selectedModels);
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
    console.log('---main.js onModelSelected aggregatedView.modelItems:', aggregatedView.modelItems);
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
        console.log('---main.js onModelSelected existingUrns:', existingUrns);
        const newUrns = urns.filter(urn => !existingUrns.includes(urn));
        console.log('---main.js onModelSelected newUrns:', newUrns);

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
            console.log('---main.js onModelSelected newUrns is empty:', newUrns);
            return;
        }
        
        console.log('---main.js onModelSelected urns:', urns);

        const tasks = urns.map(async urn => {
            window.location.hash = urn;
            console.log('---main.js onModelSelected urn:', urn);

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
        console.log('---main.js onModelSelected bubbles:', bubbles);
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
