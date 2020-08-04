#!/usr/bin/env node

const yargs = require('yargs');

const { argv } = yargs // eslint-disable-line no-unused-vars
    .scriptName('mybc')
    .command(require('./cmd/prebuild'))
    .command(require('./cmd/postbuild'))
    .demandCommand()
    .strict();
