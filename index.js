const {app, shell} = require('electron')
const ProgressBar = require('electron-progressbar')
const axios = require("axios");
const fs = require("fs");
const ini = require('ini')
const path = require("path");
const exec = require('child_process').exec;
const AdmZip = require("adm-zip")
const os = require("os");

const rootPath = path.join(os.homedir(), 'Mimic-Launcher');

if (!fs.existsSync(rootPath)) {
    fs.mkdirSync(rootPath);
}

const repository = "dkks112313/dist-install"
const configPath = path.join(rootPath, "version.ini");

const defaultConfig = {
    version: {
        version_id: "alpha-1.1-03.02.2025-11:44"
    }
};
let currentConfig = loadConfig();

function loadConfig() {
    if (fs.existsSync(configPath)) {
        const fileData = fs.readFileSync(configPath, "utf-8");
        const config = ini.parse(fileData);

        let updated = false;
        for (const key in defaultConfig.version) {
            if (!(key in config.version)) {
                config.version[key] = defaultConfig.version[key];
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
        version: {...currentConfig.version, ...updatedConfig}
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

        const writer = fs.createWriteStream(path.join(rootPath, downloadPath));

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

function zipExtract(nameArchive, excludeFile) {
    const zipArchive = new AdmZip(path.join(rootPath, nameArchive));
    const zipEntries = zipArchive.getEntries(); // Получаем список файлов

    zipEntries.forEach(entry => {
        if (entry.entryName !== excludeFile) {
            zipArchive.extractEntryTo(entry.entryName, rootPath, true, true);
        }
    });
}

function zipDelete(nameArchive) {
    fs.unlink(path.join(rootPath, nameArchive), (err) => {})
}

app.on('ready', function () {
    gitLatestVersion()
        .then(version => {
            fetch(`https://api.github.com/repos/${repository}/releases/latest`)
                .then(res => res.json())
                .then(data => data.assets[0]['browser_download_url'])
                .then(url => {
                    const name = url.split('/').pop()

                    if (version !== currentConfig['version']['version_id']) {
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
                            .then(() => zipExtract(name.split('/').pop(), "update.exe"))
                            .then(() => zipDelete(name.split('/').pop()))
                            .then(() => {
                                return new Promise((resolve) => {
                                    setTimeout(() => {
                                        resolve();
                                    }, 10000);
                                });
                            })
                            .then(() => updateConfig({version_id: version}))
                            .then(() => {
                                progressBar.setCompleted();
                            })
                            .finally(() => exec(path.join(rootPath, 'Mimic-Launcher.exe')))
                    }
                    else {
                        exec(path.join(rootPath, 'Mimic-Launcher.exe'))
                    }
                    app.quit()
                })
        })
});
