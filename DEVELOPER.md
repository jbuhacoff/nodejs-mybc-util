Developer Documentation for MyBC
--------------------------------

Source code is hosted at GitHub:

`https://github.com/jbuhacoff/nodejs-mybc-util`

Updating dependencies
---------------------

Update NPM itself (replace `10.4.0` with the most recent version):

```sh
sudo npm install -g npm@10.4.0
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
