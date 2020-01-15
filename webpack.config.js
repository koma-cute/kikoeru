const path = require('path');
const OptimizeCssAssetsPlugin = require('optimize-css-assets-webpack-plugin'); // 压缩 CSS 的插件
const MiniCssExtractPlugin = require('mini-css-extract-plugin'); // 提取所有 CSS 到单独的 CSS 文件的插件
const HtmlWebpackPlugin = require('html-webpack-plugin'); // 生成 html 文件的插件
const { CleanWebpackPlugin } = require('clean-webpack-plugin'); // 自动删除 webpack 打包后的文件夹以及文件的插件

const production = process.argv[process.argv.indexOf('--mode') + 1] === 'production';

module.exports = {
  /**
   * entry 入口文件
   *   向 entry 属性传入文件路径数组时，创建"多个主入口"
   *   babel 是一个广泛使用的转码器，可以把 ES6 和 ES7 的代码转换成 ES5 代码
   */ 
  entry: ['babel-polyfill', './src/client/index.jsx'],
  // output 出口文件
  output: {
    path: path.join(__dirname, 'dist'),
    publicPath: '/',
    filename: 'bundle.js',
  },
  // Loaders 用于预处理源文件，将其转换为浏览器可以执行的普通js文件
  module: {
    rules: [{
      test: /\.(js|jsx)$/,
      exclude: /node_modules/,
      use: {
        loader: 'babel-loader', // babel-loader 把 ES6 和 ES7 的代码转换成 ES5 代码
      },
    },
    {
      test: /\.(css|less)$/,
      use: [
        {
          loader: MiniCssExtractPlugin.loader, // 提取 CSS 到单独的 CSS 文件
          options: { hmr: !production }, // hmr 模块热替换
        },
        'css-loader',
        'less-loader',
      ],
    },
    {
      test: /\.(png|woff|woff2|eot|ttf|svg)$/,
      loader: 'url-loader?limit=100000',
    },
    ],
  },
  // webpack 在启动后会从配置的入口模块出发找出所有依赖的模块
  // resolve 配置 webpack 如何寻找模块所对应的文件
  resolve: {
    extensions: ['*', '.js', '.jsx'], // 在导入语句没带文件后缀时，webpack 会先自动带上后缀再去尝试访问文件是否存在
    alias: { // 通过别名来把原导入路径映射成一个新的导入路径
      inferno: production ? 'inferno' : 'inferno/dist/index.dev.esm.js',
      // 'uikit-util': 'uikit/src/js/util/index',
      // uikit: 'uikit/src/js/uikit',
    },
  },
  // webpack-dev-server 是一个小型的 Node.js Express 服务器，
  // 默认支持热替换
  devServer: { // 配置
    //host: '0.0.0.0',
    host: 'localhost',
    port: 3000,
    open: true, // 自动打开浏览器
    historyApiFallback: true, // 将 404 响应替换为 index.html
    proxy: { // 启用代理，连接后端服务
      '/api': 'http://localhost:8888', // 请求到 /api/xxx 现在会被代理到请求 http://localhost:8888/api/xxx
    },
  },
  // 使用插件
  plugins: [
    new OptimizeCssAssetsPlugin(),
    new MiniCssExtractPlugin(),
    new CleanWebpackPlugin(),
    new HtmlWebpackPlugin({
      template: './static/index.html', // 根据自己的指定的模板文件来生成特定的 html 文件
    }),
  ],
  // 优化
  optimization: {
    mangleWasmImports: true,
    splitChunks: { // 分包
      chunks: 'async', // 只从异步加载的模块(动态加载import())里面进行拆分
    },
  },
};
