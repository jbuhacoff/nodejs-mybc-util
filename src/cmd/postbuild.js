const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');
const mustache = require('mustache');
const { Log } = require('@libertyio/log-node');

let log = new Log({ tag: 'mybc' });

/**
Input: path to file or directory
Output: true if a directory, false otherwise
*/
// const isDirectory = function (filepath) {
//     return fs.lstatSync(filepath).isDirectory();
// };

/**
Input: path to file or directory
Output: true if a directory, false otherwise
*/
// const isJarFile = function (filepath) {
//     return fs.lstatSync(filepath).isFile() && filepath.endsWith('.jar');
// };

function isIntermediateCurrent(context) {
    if (fs.existsSync(context.filepath1)) {
        const filepathInfo = fs.lstatSync(context.filepath);
        const filepath1Info = fs.lstatSync(context.filepath1);
        if (filepath1Info.mtimeMs >= filepathInfo.mtimeMs) {
            return true;
        }
        if (fs.existsSync(context.filepath2)) {
            const filepath2Info = fs.lstatSync(context.filepath2);
            if (filepath2Info.mtimeMs >= filepath1Info.mtimeMs) {
                return true;
            }
        }
    }
    return false;
}

function isFinalCurrent(context) {
    if (fs.existsSync(context.filepath2)) {
        const filepathInfo = fs.lstatSync(context.filepath);
        const filepath2Info = fs.lstatSync(context.filepath2);
        if (filepathInfo.mtimeMs >= filepath2Info.mtimeMs) {
            return true;
        }
    }
    return false;
}

// on windows, nodejs spawn function only works with '.exe' files, but the program
// might be a batch script so spawnSync('program',...) won't work
// in a posix shell: 'program args...'
// in windows: 'cmd /c program args...' works with executables and scripts
function runMaven(argv) {
    // console.log('checking platform type');
    const isWin = process.platform === 'win32';
    // console.log(`platform type is win? ${isWin}`);
    let cmd = 'mvn';
    let prepend = [];
    if (isWin) {
        cmd = 'cmd';
        prepend = ['/c', 'mvn'];
    }

    // console.log([cmd, ...prepend, ...argv].join(' '));
    log.trace([cmd, ...prepend, ...argv].join(' '));
    const result = childProcess.spawnSync(cmd, [...prepend, ...argv]);

    if (result.error && result.error.code === 'ENOENT') {
        throw new Error('mybc postbuild requires mvn');
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
        throw new Error(`mvn exit code: ${result.status}`);
    }
}

function processJarfile(context) {
    // skip mvn install if we already did it
    if (!isIntermediateCurrent(context)) {
        fs.copyFileSync(context.filepath, context.filepath1);

        // install the artifact into local maven repository
        // we append "-mybc-intermediate" to the artifactId to
        // differentiate them from the original bc artifacts that may be installed
        // this intermediate artifact id is referenced in the postbuild-maven.xml file
        // NOTE: we don't use a classifier because on some systems maven complains about an artifact referencing itself
        // NOTE: if we could run the maven shade plugin and just specify the location of the input file,
        // then we wouldn't need this time-consuming step of doing a maven install on each of the temporary files
        // console.log('Preparing %s %s', context.artifactId, context.version);
        log.trace(`preparing ${context.artifactId} ${context.version}`);
        try {
            runMaven([
                'install:install-file',
                `-DgroupId=${context.groupId}`,
                `-DartifactId=${context.artifactId}-mybc-intermediate`,
                `-Dversion=${context.version}`,
                '-Dpackaging=jar',
                `-Dfile=${context.filepath1}`,
                '-DgeneratePom=false',
            ]);
        } catch (err) {
            context.error = true;
            // console.error('processJarfile failed', err);
            log.error(`processJarfile failed: ${JSON.stringify(err)}`);
        }
    }

    // example output from successful mvn install:install-file
    // [INFO] Installing build/artifacts/jdk1.5/jars/bcpkix-jdk15on-162.jar to .m2/repository/my/bouncycastle/bcpkix-jdk15on/1.62/bcpkix-jdk15on-1.62-local.jar

    // run maven shade plugin using generated xml file for each artifact
    // skip mvn shade if we already did it
    if (!isFinalCurrent(context)) {
        if (fs.existsSync(context.filepath2)) {
            // remove filepath2 because maven shade plugin doesn't like to overwrite existing files
            fs.unlinkSync(context.filepath2);
        }
        // console.log('Processing %s %s', context.artifactId, context.version);
        log.trace(`processing ${context.artifactId} ${context.version}`);

        // e.g. mvn shade:shade -f build/mybc/bcprov-jdk15on-162-postbuild-maven.xml
        try {
            runMaven([
                'package',
                '-f',
                context.mavenfile,
            ]);
        } catch (err) {
            context.error = true;
            // console.error('processJarfile failed', err);
            log.error(`processJarfile failed: ${JSON.stringify(err)}`);
        }

        // copy final jar to the default bc jar location so developers know where to find it
        if (fs.existsSync(context.filepath2)) {
            fs.copyFileSync(context.filepath2, context.filepath);

            // install to local maven repository so it's ready to use
            // console.log('Installing to local Maven repository: %s:%s:%s', context.groupId, context.artifactId, context.version);
            log.info(`Installing to local Maven repository: ${context.groupId} ${context.artifactId} ${context.version}`);
            try {
                runMaven([
                    'install:install-file',
                    `-DgroupId=${context.groupId}`,
                    `-DartifactId=${context.artifactId}`,
                    `-Dversion=${context.version}`,
                    '-Dpackaging=jar',
                    `-Dfile=${context.filepath2}`,
                    '-DgeneratePom=false',
                ]);
            } catch (err) {
                context.error = true;
                // console.error('processJarfile failed', err);
                log.error(`processJarfile failed: ${JSON.stringify(err)}`);
            }
        }
    }
}

exports.command = 'postbuild';
exports.describe = 'generate custom BouncyCastle jars after the build';
exports.builder = function builder(yargs) {
    return yargs
        .option('trace', {
            describe: 'enable trace output',
            type: 'boolean',
            default: false,
        })
        .option('groupId', {
            describe: 'for Maven dependency information',
            requiresArg: true,
            default: 'my.bouncycastle',
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

        log.trace('postbuild handler');
        // read settings
        const targetdir = path.join(process.cwd(), 'build', 'mybc');
        const bcbuildproperties = fs.readFileSync('bc-build.properties').toString();
        const bcversion = bcbuildproperties.match(/^release\.name: (.+)$/m)[1]; // e.g. 1.62
        const bcsuffix = bcbuildproperties.match(/^release\.suffix: (.+)$/m)[1]; // e.g. 162
        const datajson = fs.readFileSync(path.join(targetdir, 'prebuild-data.json')).toString();
        const data = JSON.parse(datajson);

        // generate one maven file per artifact (./build/artifacts/jdk1.5/jars/bcmail-jdk15on-162.jar)
        const artifacts = ['bcmail', 'bcpg', 'bcpkix', 'bcprov-ext', 'bcprov', 'bctest', 'bctls'];
        const jdkMap = {
            'jdk1.3': 'jdk13',
            'jdk1.4': 'jdk14',
            'jdk1.5': 'jdk15on',
        };

        const queue = [];
        const jdkList = Object.getOwnPropertyNames(jdkMap); // i.e. [ "jdk1.3", "jdk1.4", "jdk1.5" ]
        for (let i = 0; i < jdkList.length; i += 1) {
            const jdk = jdkList[i];
            const jarpath = path.join(process.cwd(), 'build', 'artifacts', jdk, 'jars');
            for (let j = 0; j < artifacts.length; j += 1) {
                const artifactId = `${artifacts[j]}-${jdkMap[jdk]}`;
                const filepath = path.join(jarpath, `${artifactId}-${bcsuffix}.jar`); // bc jar file (intermediate, and later final output)
                const filepath1 = path.join(targetdir, `${artifactId}-${bcsuffix}.jar`); // bc jar file (intermediate, before maven shade plugin)
                const filepath2 = path.join(targetdir, `${artifactId}-${bcsuffix}-shaded.jar`); // final mybc jar file (after maven shade plugin)
                if (fs.existsSync(filepath)) {
                    queue.push({
                        jdk, artifactId, filepath, filepath1, filepath2, groupId: argv.groupId, version: bcversion,
                    });
                }
            }
        }

        // generate a maven xml file for each jar we will process
        const template = fs.readFileSync(path.join(__dirname, '..', 'postbuild-maven.xml.template')).toString();
        for (let i = 0; i < queue.length; i += 1) {
            const tmpdata = {
                ...data, ...queue[i], groupId: argv.groupId, version: bcversion, outfile: queue[i].filepath2,
            };
            const xml = mustache.render(template, tmpdata);
            const mavenfile = path.join(targetdir, `${queue[i].artifactId}-${bcsuffix}-postbuild-maven.xml`);
            fs.writeFileSync(mavenfile, xml);
            queue[i].mavenfile = mavenfile;
        }

        // complete the process for each of the jar files
        for (let i = 0; i < queue.length; i += 1) {
            processJarfile(queue[i]);
        }
    } catch (e) {
        // console.error('error: postbuild failed', e);
        log.error(`postbuild failed: ${JSON.stringify(e)}`);
        process.exit(1);
    }
};
