const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');
const mustache = require('mustache');
const { Log } = require('@libertyio/log-node');

let log = new Log({ tag: 'mybc' });

// const isYamlFile = function (filepath) {
//     return fs.lstatSync(filepath).isFile() && filepath.endsWith('.yaml');
// };

// on windows, nodejs spawn function only works with '.exe' files, but the program
// might be a batch script so spawnSync('program',...) won't work
// in a posix shell: 'program args...'
// in windows: 'cmd /c program args...' works with executables and scripts
function runAnt(argv) {
    // console.log('checking platform type');
    const isWin = process.platform === 'win32';
    // console.log(`platform type is win? ${isWin}`);
    let cmd = 'ant';
    let prepend = [];
    if (isWin) {
        cmd = 'cmd';
        prepend = ['/c', 'ant'];
    }

    // console.log([cmd, ...prepend, ...argv].join(' '));
    log.trace([cmd, ...prepend, ...argv].join(' '));
    const result = childProcess.spawnSync(cmd, [...prepend, ...argv]);

    if (result.error && result.error.code === 'ENOENT') {
        throw new Error('mybc postbuild requires ant');
    }
    if (result.status && result.status !== 0) {
        if (result.stderr) {
            // console.log(result.stderr.toString());
            log.print(result.stderr.toString());
        }
        if (result.stdout) {
            // console.log(result.stdout.toString());
            log.print(result.stdout.toString());
        }
        // console.log("Maven exit code: %d", result.status);
        throw new Error(`ant exit code: ${result.status}`);
    }
}

exports.command = 'prebuild';
exports.describe = 'customize BouncyCastle sources before the build';
exports.builder = function builder(yargs) {
    return yargs
        .option('trace', {
            describe: 'enable trace output',
            type: 'boolean',
            default: false,
        })
        .option('providerName', {
            describe: 'replaces "BC" strings',
            requiresArg: true,
            default: 'MyBC',
        })
        .option('packageName', {
            describe: 'replaces "org.bouncycastle" strings',
            requiresArg: true,
            default: 'my.bouncycastle',
        })
        .option('displayName', {
            describe: 'replaces "Bouncy", "BouncyCastle", and "Bouncy Castle" strings',
            requiresArg: true,
            default: 'MyBouncyCastle',
        });
};
exports.handler = function handler(argv) {
    try {
        log = new Log({
            tag: 'mybc',
            enable: {
                error: true, warn: true, info: true, ok: true, print: true, trace: argv.trace,
            },
        });

        // create mybc build directory to separate mybc files from original bc files
        const targetdir = path.join('build', 'mybc');
        fs.mkdirSync(targetdir, { recursive: true }); // node 10+ is required for {recursive:true}

        // prebuild ant file to do text replacements for the entire project
        const data = { providerName: argv.providerName, packageName: argv.packageName, displayName: argv.displayName };
        const template = fs.readFileSync(path.join(__dirname, '..', 'prebuild-ant.xml.template')).toString();
        const xml = mustache.render(template, data);
        const xmlfile = path.join(targetdir, 'prebuild-ant.xml');
        fs.writeFileSync(xmlfile, xml);

        // write settings to reuse in postbuild
        const datafile = path.join(targetdir, 'prebuild-data.json');
        fs.writeFileSync(datafile, JSON.stringify(data));

        // transform BC source code using settings
        runAnt([
            '-f', xmlfile,
            `-Dbasedir=${process.cwd()}`,
        ]);
    } catch (e) {
        // console.error('error: prebuild failed', e);
        log.error(`error: prebuild failed: ${JSON.stringify(e)}`);
        process.exit(1);
    }
};
