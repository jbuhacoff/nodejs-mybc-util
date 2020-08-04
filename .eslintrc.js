// https://eslint.org/docs/user-guide/configuring
module.exports = {
    root: true,
    env: {
        node: true,
        mocha: true,
    },
    plugins: [
        // "mocha"
    ],
    extends: [
        'airbnb-base',
        // 'plugin:mocha/recommended',
    ],
    rules: {
        // 'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'off',
        // 'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
        'no-console': 'off',
        'max-len': 'off',
        indent: ['error', 4],
        'import/prefer-default-export': 'off',
        // 'prefer-arrow-callback': 'off',
        'func-names': ['error', 'as-needed'],
    },
    parserOptions: {
        parser: 'babel-eslint',
    },
};
