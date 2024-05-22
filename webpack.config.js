// webpack.config.js
const path = require('path');

module.exports = {
  entry: './dist/index.js', // Adjust the entry point to your compiled JS file
  output: {
    path: path.resolve(__dirname, 'bundle'),
    filename: 'roadslip-react.js',
    library: 'RoadslipReact',
    libraryTarget: 'umd',
  },
  resolve: {
    fallback: {
      "fs": false,
      "path": false,
      // Add more polyfills as needed
    }
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        use: 'babel-loader',
        exclude: /node_modules/
      }
    ]
  }
};