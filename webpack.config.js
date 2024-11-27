/* -.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.
 * File Name   : webpack.config.js
 * Created at  : 2024-11-26
 * Updated at  : 2024-11-26
 * Author      : jeefo
 * Purpose     :
 * Description :
.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.*/
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  entry: "./src/index.tsx",

  resolve: {
    extensions: [".ts", ".tsx", ".js"],
  },

  devServer: {
    hot: true,
    historyApiFallback: true,
    liveReload: false,
    client: {
      logging: "warn",
    },
    static: {
      directory: "public",
      publicPath: "/",
    },
    allowedHosts: "all",
  },

  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "swc-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.(scss|sass)$/,
        use: [
          "style-loader",
          "css-loader",
          "sass-loader",
        ],
        exclude: /node_modules/,
      },
    ],
  },

  plugins: [
    new HtmlWebpackPlugin({
      template: "./public/index.html",
      filename: "index.html",
    }),
  ],
};