# vue-component-finder-loader
Webpack loader for [vue-component-finder](https://github.com/csonlai/vue-component-finder)


# Example
![插件展示][1]

# Install

```
    npm install vue-component-finder-loader
```


# Usage

webpack 2.x:
``` js
    module: {
        rules: [{
            test: /\.(vue)$/,
            loader: 'vue-component-finder-loader',
            enforce: "pre",
            include: ['src']
        }]
    }
```
webpack 1.x:
``` js
    module: {
        preLoaders: [{
            test: /\.(vue)$/,
            loader: 'vue-component-finder-loader',
            include: ['src']
        }]
    }
```


  [1]: http://p.qpic.cn/pic_wework/3832524150/beb84ab606969bfaf48d8997b870cfa549817938e8657f98/0