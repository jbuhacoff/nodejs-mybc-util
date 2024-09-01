Developer Documentation for MyBC
--------------------------------

Source code is hosted at GitHub:

`https://github.com/jbuhacoff/nodejs-mybc-util`

Updating dependencies
---------------------

Update NPM itself (replace `10.8.3` with the most recent version):

```sh
sudo npm install -g npm@10.8.3
```

Install dependencies:

```sh
npm install
```

Check for dependencies that need to be updated:

```sh
npm audit
```

To update dependencies, edit their versions in `package.json` and then
run `npm install`.

Install from source
-------------------

To install the tool from the source directory:

```sh
npm pack
sudo npm install -g jbuhacoff-mybc-1.0.6.tgz
```

Note that the archive file name with version number on the second line is
whatever was printed at the end of the `npm pack` command.

You can then check it was installed successfully:

```sh
which mybc
```


