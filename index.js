"use strict";
const fs = require('fs');
const path = require('path');
var htmlparser = require("htmlparser2");


const htmlTagList = ['div','span','a', 'abbr', 'acronym', 'address', 'applet', 'area', 'article', 'aside', 'audio', 'b', 'base', 'basefont', 'bdi', 'bdo', 'button', 'bgsound', 'big', 'blink', 'br', 'p', 'h1', 'h2','h3', 'h4', 'b', 'strong', 'form', 'label', 'input', 'textarea', 'select', 'checkbox', 'radio', 'iframe',
'ul','ol','li', 'link', 'title', 'meta', 'head', 'body', 'html', 'img','canvas','th','td', 'tbody', 'thead', 'tr', 'i', 'caption', 'center', 'cite', 'code', 'col', 'colgroup', 'command', 'content', 'data', 'datalist', 'dd', 'del', 'details', 'dfn', 'dialog', 'dir', 'dl', 'dt', 'element', 'em', 'embed', 'fieldset', 'figcaption', 'figure', 'font',
'footer', 'frame', 'frameset', 'header', 'hgroup', 'hr', 'image', 'ins', 'isindex', 'kbd', 'keygen', 'legend', 'listing', 'main', 'map', 'mark', 'marquee', 'menu', 'menuitem', 'meter', 'multicol', 'nav', 'nobr', 'noembed', 'noframes', 'noscript', 'object', 'optgroup', 'option', 'output', 'param', 'picture',
'plaintext', 'pre', 'progress', 'q', 'rp', 'rt', 'rtc', 'ruby', 's', 'samp', 'script', 'section', 'shadow', 'slot', 'small', 'source', 'spacer', 'strike', 'style', 'sub', 'summary', 'sup', 'table', 'template', 'textarea', 'tfoot', 'time', 'track', 'tt', 'u', 'var', 'video', 'wbr', 'xmp'];

const getTemplateContent = (content, callback) => {
    return content.replace(/<template>([\s\S]*)<\/template>/, (str,str1) => {
       return '<template>' + callback(str1) + '<\/template>';
    });
}


const getPathAndIndex = (content, tagName) => {
  const tagReg = new RegExp('<' + tagName + '([\\s\\S]*?)>([\\s\\S]*)<\\/' + tagName + '>')
  const result = content.match(tagReg);
  if (result) {
    const srcResult = result[1].match(/src\=['"](.*?)['"]/);
    const lineIndex = content.substr(0, result.index).split('\n').length - 1;
    const lineLastIndex = lineIndex + result[2].split('\n').length - 1;
    return {
      path: srcResult ? srcResult[1] : null,
      lineIndex: srcResult ? null : lineIndex,
      lineLastIndex: srcResult ? null : lineLastIndex
    }
  }
  return {};
}

const getTemplatePath = (content) => {
  const result  =content.match(/<template([\\s\\S]*?)src=['"]([\\s\\S]*?)['"]>([\\s\\S]*?)<\/template>/);
  if (result) {
    return result[2];
  }
}

const getAbsolutePath = (relativePath, fileAbsolutePath) => {
  return path.resolve(path.dirname(fileAbsolutePath), relativePath);
}

class Node {
    constructor (options) {
        this.tagName = options.tagName;
        this.attr = options.attr || {};
        this.content = options.content || '';
        this.children = options.children || [];

    }
    toString () {
      const tagName = this.tagName;
      const childStrList = this.children.map(child => {
          return child.toString();
      });
      const attrStrList = [];

      for (let attrName in this.attr) {
        const attrValue = this.attr[attrName];
        attrStrList.push(` ${attrName}="${attrValue}"`);
      }
      return `<${tagName}${attrStrList.join('')}>${childStrList.length ? childStrList.join('') : this.content != null ? this.content : ''}</${tagName}>`;
    }
}



module.exports = function (content) {
    const nodeStack = [];
    const filePath = this.resourcePath;

    let root;
    let tplContent = content;
    // 模板路径
    const templateInfo = getPathAndIndex(tplContent, 'template');
    // 样式路径
    const styleInfo = getPathAndIndex(tplContent, 'style');
    // 脚本路劲
    const scriptInfo = getPathAndIndex(tplContent, 'script');

    console.log('start:' + filePath);

    // 外部模板
    if (templateInfo.path) {
        tplContent = fs.readFileSync(getAbsolutePath(filePath, templateInfo.path));
    }
    // 模版内容
    tplContent = getTemplateContent(tplContent, tpl => {
        // 每行内容
        var tplLineArr = tpl.split('\n');
        var currentLineIndex = 0;
        var tagRegLastIndex = 0;
        var tagRegResult;
        var lastStartTagName;

        var parser = new htmlparser.Parser({
            onopentag (tagName, attr) {
                console.log('open:' + tagName);
                let lastStackNode = nodeStack[nodeStack.length - 1];
                lastStartTagName = tagName;
                var node = new Node({
                    tagName,
                    attr
                });
                // 根元素
                if (!root) {
                    // 模版路径
                    attr['data-template-path'] = templateInfo.path ? getAbsolutePath(templateInfo.path, filePath) : (templateInfo.lineIndex != null ? (filePath + ':' + (templateInfo.lineIndex + 1)) : '');
                    attr['data-template-last-index'] = templateInfo.lineLastIndex != null ? templateInfo.lineLastIndex : '';
                    attr['data-style-path'] = styleInfo.path ? getAbsolutePath(styleInfo.path, filePath) : (styleInfo.lineIndex != null ? (filePath + ':' + (styleInfo.lineIndex + 1)) : '');
                    attr['data-style-last-index'] = styleInfo.lineLastIndex != null ? styleInfo.lineLastIndex : '';
                    attr['data-script-path'] = scriptInfo.path ? getAbsolutePath(scriptInfo.path, filePath) : (scriptInfo.lineIndex != null ? (filePath + ':' + (scriptInfo.lineIndex + 1)) : '');
                    attr['data-script-last-index'] = scriptInfo.lineLastIndex != null ? scriptInfo.lineLastIndex : '';
                    root = node;
                }
                else if (htmlTagList.indexOf(tagName) < 0) {

                    var lineContent = tplLineArr[currentLineIndex];
                    // 从上次匹配的位置之后开始匹配
                    lineContent = lineContent.substr(tagRegLastIndex, lineContent.length);

                    var tagReg = new RegExp('<' + tagName + '[^>]*','gm');
                    tagRegResult = null;
                    while ((tagRegResult = tagReg.exec(lineContent)) == null) {
                      currentLineIndex++;
                      tagRegLastIndex = 0;
                      lineContent = tplLineArr[currentLineIndex];
                    }
                    // 记录该行上次匹配的
                    tagRegLastIndex = tagRegResult[0].length + tagRegResult.index;
                    // 调用方模版路径
                    attr['data-created-path'] = filePath;
                    attr['data-created-index'] = currentLineIndex;

                }

                if (lastStackNode) {
                    lastStackNode.children.push(node);
                }
                nodeStack.push(node);
            },
            ontext(text) {
              if (!text.trim()) {
                return;
              }
              let lastStackNode = nodeStack[nodeStack.length - 1];
              if (lastStackNode) {
                lastStackNode.content = text;
              }
            },
            onclosetag(tagName) {
                var node = nodeStack.pop();

                console.log('close:' + tagName);

                if (htmlTagList.indexOf(tagName) > -1 || node === root) {
                  return;
                }

                var lineContent = tplLineArr[currentLineIndex];
                var lastEndTag = lineContent.substr(tagRegLastIndex - 1, 3);


                if (lastEndTag === '\/>' && tagName === lastStartTagName) {
                  node.attr['data-created-last-index'] = currentLineIndex;
                  return;
                }

                // 从上次匹配的位置之后开始匹配
                lineContent = lineContent.substr(tagRegLastIndex, lineContent.length);
                var tagReg = new RegExp('<\\/' + tagName + '(\\s+([\\s\\S]*?))?>','gm');

                tagRegResult = null;

                while ((tagRegResult = tagReg.exec(lineContent)) == null) {

                  currentLineIndex++;
                  tagRegLastIndex = 0;
                  lineContent = tplLineArr[currentLineIndex];
                }

                // 记录该行上次匹配的
                tagRegLastIndex = tagRegResult[0].length + tagRegResult.index;
                node.attr['data-created-last-index'] = currentLineIndex;
            }
        },{
            xmlMode:true,
            recognizeSelfClosing: true,
            lowerCaseAttributeNames: false
        });
        parser.write(tpl);
        parser.end();
        return root.toString();
    });

    if (templateInfo.path) {
      fs.writeFileSync(templateInfo.path, tplContent);
    } else {
      content = tplContent;
    }
    console.log('end:' + filePath);
    // fs.appendFileSync('test.txt', filePath + ':' + content + '\n');

    return content;
}