#!/usr/bin/env node

const yargs = require('yargs');

const argv = yargs
    .scriptName('mybc')
    .command(require('./cmd/prebuild'))
    .command(require('./cmd/postbuild'))
    .demandCommand()
    .strict()
    .argv;
