const child_process = require('child_process');
const fs = require('fs');
const path = require('path');
const mustache = require('mustache');


const isYamlFile = function (filepath) {
    return fs.lstatSync(filepath).isFile() && filepath.endsWith(".yaml");
};

exports.command = 'prebuild';
exports.describe = 'customize BouncyCastle sources before the build';
exports.builder = function (yargs) {
    return yargs
    .option('providerName', {
        describe: 'replaces "BC" strings',
        requiresArg: true,
        default: "MyBC"
    })
    .option('packageName', {
        describe: 'replaces "org.bouncycastle" strings',
        requiresArg: true,
        default: "my.bouncycastle"
    })
    .option('displayName', {
        describe: 'replaces "Bouncy", "BouncyCastle", and "Bouncy Castle" strings',
        requiresArg: true,
        default: "MyBouncyCastle"
    })
};
exports.handler = function (argv) {
    try {
        // create mybc build directory to separate mybc files from original bc files
        const targetdir = path.join("build","mybc");
        fs.mkdirSync(targetdir, {recursive: true}); // node 10+ is required for {recursive:true}
        
        // prebuild ant file to do text replacements for the entire project
        var data = {providerName:argv.providerName,packageName:argv.packageName,displayName:argv.displayName};
        var template = fs.readFileSync(path.join(__dirname,"..","prebuild-ant.xml.template")).toString();
        var xml = mustache.render(template, data);
        var xmlfile = path.join(targetdir,"prebuild-ant.xml");
        fs.writeFileSync(xmlfile, xml);
        
        // write settings to reuse in postbuild
        var datafile = path.join(targetdir,"prebuild-data.json");
        fs.writeFileSync(datafile, JSON.stringify(data));
        
        // transform BC source code using settings
        var result = child_process.spawnSync("ant", [
            "-f", xmlfile,
            "-Dbasedir="+process.cwd()
            ]);
        
        if( result.error && result.error.code === 'ENOENT' ) {
            console.error("mybc prebuild requires ant");
        }
        if( result.status && result.status !== 0 ) {
            console.log("Ant exit code: %d", result.status);
            if( result.stderr ) {
                console.log(result.stderr.toString());
            }
            if( result.stdout ) {
                console.log(result.stdout.toString());
            }
        }
        
    }
    catch(e) {
        console.error("error: prebuild failed", e);
        process.exit(1);
    }
};
