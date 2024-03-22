const express = require('express');
const router = express.Router();
const path = require('path');

const { spawn } = require('child_process');

router.get('/run-script', (req, res) => {
    let length = req.query.length || 5;
    let height = req.query.height || 3;
    let thickness = req.query.thickness || 0.2;

    console.log(`Length: ${length}`);
    console.log(`Height: ${height}`);
    console.log(`Thickness: ${thickness}`);

    let process = spawn('C:/Users/aruzdyak/AppData/Local/Programs/Python/Python310/python.exe', 
        [path.join(__dirname, '../createIfc.py'), length.toString(), height.toString(), thickness.toString()]);

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