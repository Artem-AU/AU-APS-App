const express = require('express');
const router = express.Router();
const path = require('path');

const { spawn } = require('child_process');

router.post('/run-script', express.json(), (req, res) => {
    let paramsArray = req.body;

    console.log(`Params Array: ${JSON.stringify(paramsArray)}`);

    let process = spawn('C:/Users/aruzdyak/AppData/Local/Programs/Python/Python310/python.exe', 
        [path.join(__dirname, '../createIfc.py'), JSON.stringify(paramsArray)]);

    process.stdout.on('data', (data) => {
        console.log(`stdout: ${data.toString()}`);
    });

    process.stderr.on('data', (data) => {
        console.error(`stderr: ${data.toString()}`);
    });
    
    process.on('close', (code) => {
        console.log(`child process exited with code ${code}`);
        res.send(`Script finished with exit code ${code}`);
    });
});

module.exports = router;