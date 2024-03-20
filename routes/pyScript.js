const express = require('express');
const router = express.Router();
const path = require('path');

const { spawn } = require('child_process');

router.get('/run-script', (req, res) => {
    let process = spawn('C:/Users/aruzdyak/AppData/Local/Programs/Python/Python310/python.exe', [path.join(__dirname, '../createIfc.py')]);

    process.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
    });
    
    process.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
    });
    
    process.on('close', (code) => {
        console.log(`child process exited with code ${code}`);
        res.send(`Script finished with exit code ${code}`);
    });
});

module.exports = router;