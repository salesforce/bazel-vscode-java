//@ts-check

'use strict';

const ESLintWebpackPlugin = require('eslint-webpack-plugin');
const path = require('path');
const webpack = require('webpack');

/**@type {import('webpack').Configuration}*/
const config = {
  target: 'node',
  entry: './src/extension.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'extension.js',
    libraryTarget: 'commonjs2',
    devtoolModuleFilenameTemplate: '../[resource-path]'
  },
  devtool: 'source-map',
  externals: {
    vscode: 'commonjs vscode', // the vscode-module is created on-the-fly and must be excluded. Add other modules that cannot be webpack'ed, 📖 -> https://webpack.js.org/configuration/externals/
    fsevents: "require('fsevents')", // https://github.com/yan-foto/electron-reload/issues/71#issuecomment-588988382
  },
  resolve: {
    // support reading TypeScript and JavaScript files, 📖 -> https://github.com/TypeStrong/ts-loader
    mainFields: ['browser', 'module', 'main'], // look for `browser` entry point in imported node modules
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader'
          }
        ]
      }
    ]
  },
  plugins: [
    new ESLintWebpackPlugin({
        extensions: [
            ".ts",
            ".js"
        ]
    })
  ],
  infrastructureLogging: {
    level: 'log',
  },
};
module.exports = config;
