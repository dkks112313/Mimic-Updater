const {app} = require('electron')
const ProgressBar = require('electron-progressbar')
const axios = require("axios");
const fs = require("fs");
const ini = require('ini')
const path = require("path");
const exec = require('child_process').exec;
const AdmZip = require("adm-zip")

const repository = "dkks112313/An-Pan-Launcher"
const configPath = path.join("./config.ini");

const defaultConfig = {
    core: {
        version_id: "alpha1.1"
    }
};
let currentConfig = loadConfig();

function loadConfig() {
    if (fs.existsSync(configPath)) {
        const fileData = fs.readFileSync(configPath, "utf-8");
        const config = ini.parse(fileData);

        let updated = false;
        for (const key in defaultConfig.core) {
            if (!(key in config.core)) {
                config.core[key] = defaultConfig.core[key];
                updated = true;
            }
        }

        if (updated) {
            fs.writeFileSync(configPath, ini.stringify(config));
        }

        return config;
    } else {
        fs.writeFileSync(configPath, ini.stringify(defaultConfig));
        return defaultConfig;
    }
}

function updateConfig(updatedConfig) {
    currentConfig = {
        ...currentConfig,
        core: {...currentConfig.core, ...updatedConfig}
    };

    fs.writeFileSync(configPath, ini.stringify(currentConfig));
    console.log("Config updated and saved.");
}

async function downloadFile(url, downloadPath) {
    try {
        const response = await axios({
            url,
            method: 'GET',
            responseType: 'stream'
        });

        const writer = fs.createWriteStream(downloadPath);

        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
    } catch (error) {
        console.error('Error downloading the file:', error);
    }
}

function gitLatestVersion() {
    return fetch(`https://api.github.com/repos/${repository}/releases/latest`)
        .then(res => res.json())
        .then(data => data['name'])
}

function zipExtract(nameArchive) {
    const zipArchive = new AdmZip(nameArchive)
    zipArchive.extractAllTo(path.resolve('./'), true)
}

function zipDelete(nameArchive) {
    fs.unlink(nameArchive, (err) => {})
}

app.on('ready', function () {
    gitLatestVersion()
        .then(version => {
            fetch(`https://api.github.com/repos/${repository}/releases/latest`)
                .then(res => res.json())
                .then(data => data.assets[0]['browser_download_url'])
                .then(url => {
                    const name = url.split('/').pop()

                    if (version !== currentConfig['core']['version_id']) {
                        let progressBar = new ProgressBar({
                            text: 'Preparing data...',
                            detail: 'Wait...',
                            style: {
                                text: {
                                    'font-weight': 'bold',
                                    'color': '#B11C11'
                                },
                                detail: {
                                    'color': '#3F51B5'
                                },
                                bar: {
                                    'background': '#FFD2CF'
                                },
                                value: {
                                    'background': '#F44336'
                                }
                            },
                            browserWindow: {
                                width: 500,
                                backgroundColor: '#18191a'
                            }
                        });

                        progressBar
                            .on('completed', function () {
                                console.info(`completed...`);
                                progressBar.detail = 'Task completed. Exiting...';
                            })
                            .on('aborted', function () {
                                console.info(`aborted...`);
                            });

                        downloadFile(url, name)
                            .then(() => {
                                progressBar.setCompleted();
                            })
                            .then(() => zipExtract(name))
                            .then(() => zipDelete(name))
                            .then(() => updateConfig({version_id: version}))
                    }

                    //exec('"win.exe"')
                    app.quit()
                })
        })
});
