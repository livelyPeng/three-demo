var path = require('path');
const TerserPlugin = require('terser-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
module.exports = {
    mode: "production",
    entry: path.resolve(__dirname, 'src/ThreeNode.js'),
    output: {
        path: path.resolve(__dirname, 'dist'),
        publicPath: './',
        filename: 'js/ThreeNode.js',
        library: 'ThreeNode',
        libraryTarget: 'umd',
        libraryExport: "default", // 对外暴露default属性，就可以直接调用default里的属性
    },
    resolve: {
        extensions: ['.ts', '.js'],
    },
    plugins: [
        new TerserPlugin(),
        // 不要使用 因为你是html使用vue，默认脚本被加载到最后了会报错
        // new HtmlWebpackPlugin({
        //     template: './index.html',
        //     filename: './index.html'
        // }),
    ]
}