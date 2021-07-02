const { src, dest, series, parallel, watch } = require('gulp')
const del  = require('del')
const loadPlugins = require('gulp-load-plugins')

const browserSync = require('browser-sync')

const plugins = loadPlugins() // 自动加载所有插件
// const sass = require('gulp-sass')(require('sass'))
// const plugins.babel = require('gulp-babel')
// const plugins.swig = require('gulp-swig')
// const plugins.imagemin = require('gulp-imagemin')

const bs = browserSync.create() // 创建一个开发服务器

const cwd = process.cwd()
let config = {
    //default config
  build: {
    src: 'src',
    dist: 'dist',
    temp: 'temp',
    public: 'public',
    paths: {
      styles: 'assets/styles/*.scss',
      script: 'assets/scripts/*.js',
      html: '*.html',
      image: 'assets/images/**',
      font: 'assets/fonts/**'
    }
  }
}


try {
  const loadConfig = require(`${cwd}/pages.config.js`)
  config = Object.assign({}, config, loadConfig)
} catch (e) {
  console.log(e)
}

// 清除文件
const clean = () => {
  return del([config.build.dist, config.build.temp])
}

// 样式文件转换任务
const style = () => {
  return src(config.build.paths.styles, { base: config.build.src, cwd: config.build.src })
    .pipe(plugins.sass({ outputStyle: 'expanded' }))
    .pipe(dest(config.build.temp))
}


const script = () => {
  return src(config.build.paths.script,  { base: config.build.src, cwd: config.build.src })
    .pipe(plugins.babel({ presets: [require('@babel/preset-env')] }))
    .pipe(dest(config.build.temp))

}

const page = () => {
  return src(config.build.paths.html,  { base: config.build.src, cwd: config.build.src })
    .pipe(plugins.swig({ data: config.data }))
    .pipe(dest(config.build.temp))
}

const image = () => {
  return src(config.build.paths.image,  { base: config.build.src, cwd: config.build.src })
    .pipe(plugins.imagemin())
    .pipe(dest(config.build.dist))
}

const font = () => {
  return src(config.build.paths.font,  { base: config.build.src, cwd: config.build.src })
    .pipe(plugins.imagemin())
    .pipe(dest(config.build.dist))
}

const extra = () => {
  return src('**',  { base: config.build.public, cwd: config.build.public })
    .pipe(dest(config.build.dist))
}

const serve = () => {
  // 必须执行的文件
  watch(config.build.paths.styles, { cwd: config.build.src }, style)
  watch(config.build.paths.script, { cwd: config.build.src }, script)
  watch(config.build.paths.html, { cwd: config.build.src }, page)
  watch([
    config.build.paths.image,
    config.build.paths.font,
  ], { cwd: config.build.src }, bs.reload) //监听文件的变化 不需要编译的文件
  watch([
    '**',
  ], { cwd: config.build.public }, bs.reload)
  bs.init({
    notify: false,
    port: 30002,
    open: true,
    // files: ['dist/**'],
    server: {
      baseDir: [config.build.temp, config.build.dist, config.build.public], // 依次查找
      routes: {
        '/node_modules': 'node_modules'
      }
    }
  })
}


// 处理依赖的文件
const useref = () => {
  return src(config.build.paths.html, { base: config.build.temp, cwd: config.build.temp })
    .pipe(plugins.useref({ searchPath: [config.build.temp, '.'] }))
    // 压缩文件 html css js
    .pipe(plugins.if(/\.js$/, plugins.uglify()))
    .pipe(plugins.if(/\.css$/, plugins.cleanCss()))
    .pipe(plugins.if(/\.html$/, plugins.htmlmin({
      collapseWhitespace: true,
      minifyCSS: true,
      minifyJS: true
    })))
    .pipe(dest(config.build.dist))
}

const compile = parallel(style, script, page)

//上线之前执行的任务
const build = series(
  clean,
  parallel(
    series(compile, useref),
    image,
    font,
    extra
  )
)

const develop = series(compile, serve)

module.exports = {
  clean,
  build,
  develop,
  serve,
}