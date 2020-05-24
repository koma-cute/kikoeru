const fetch = require('node-fetch'); // HTTP数据请求
const htmlparser = require('htmlparser2'); // 解析器
const cheerio = require('cheerio'); // 解析器

const config = require(process.cwd() + '/config.json');

/**
 * Generates a hash integer from a given string. Hopefully only temporary until
 * reshnix exposes VA ids for scraping.
 * @param {String} name
 */
const hashNameIntoInt = (name) => {
  let hash = '';

  for (let i = 0; i < name.length; i += 1) {
    const char = name.charCodeAt(i);
    // eslint-disable-next-line no-bitwise
    hash = ((hash << 5) - hash) + char;
  }

  // eslint-disable-next-line no-bitwise
  hash |= 0;
  hash = Math.abs(Math.round(hash / 1000));
  return hash;
};

/**
 * 判断一个字符串中是否包含字母
 * @param {String} str
 */
const hasLetter = (str) => {
  for (var i in str) {
    var asc = str.charCodeAt(i);
    if ((asc >= 65 && asc <= 90 || asc >= 97 && asc <= 122)) {
      return true;
    }
  }
  return false;
};

/**
 * Scrapes work metadata from public HVDB page HTML.
 * @param {number} id Work id.
 */
const scrapeWorkMetadataFromHVDB = id => new Promise((resolve, reject) => {
  const url = `https://hvdb.me/Dashboard/WorkDetails/${id}`;

  Promise.race([fetch(url), new Promise(function(resolve,reject){
    setTimeout(() => reject(new Error('request timeout')), 1000*config.timeout); // timeout 秒
  })]) // HTTP数据请求
    .then((res) => {
      if (res.ok) {
        return res;
      } else {
        reject(new Error(`Couldn't fetch work page HTML, received ${res.statusText}`));
      }
    })
    .then(res => res.text()) // 以string的形式生成请求text
    .then((res) => { //解析
      const work = { id, tags: [], vas: [] };
      let writeTo;

      const parser = new htmlparser.Parser({
        onopentag: (name, attrs) => { // 标签名 属性
          if (name === 'input') {
            if (attrs.id === 'Name') {
              work.title = attrs.value;
            } else if (attrs.id === 'EngName' && attrs.value !== "") {
              work.title = attrs.value;
            } else if (attrs.name === 'SFW') {
              work.nsfw = attrs.value === 'false';
            }
          }

          if (name === 'a') {
            if (attrs.href.indexOf('CircleWorks') !== -1) {
              work.circle = {
                id: attrs.href.substring(attrs.href.lastIndexOf('/') + 1),
              };
              writeTo = 'circle.name';
            } else if (attrs.href.indexOf('TagWorks') !== -1) {
              work.tags.push({
                id: attrs.href.substring(attrs.href.lastIndexOf('/') + 1),
              });
              writeTo = 'tag.name';
            } else if (attrs.href.indexOf('CVWorks') !== -1) {
              work.vas.push({
                //id: hashNameIntoInt(attrs.href), // TODO: RESHNIX!!!
              });
              writeTo = 'va.name';
            }
          }
        },
        onclosetag: () => { writeTo = null; },
        ontext: (text) => {
          switch (writeTo) {
            case 'circle.name':
              work.circle.name = text;
              break;
            case 'tag.name':
              work.tags[work.tags.length - 1].name = text;
              break;
            case 'va.name':
              work.vas[work.vas.length - 1].name = text;
              work.vas[work.vas.length - 1].id = hashNameIntoInt(text);
              break;
            default:
          }
        },
      }, { decodeEntities: true });
      parser.write(res);
      parser.end();

      if (work.tags.length === 0 && work.vas.length === 0) {
        reject(new Error('Couldn\'t parse data from HVDB work page.'));
      } else {
        resolve(work);
      }
    })
    .catch((err) => {
      reject(new Error(err.message));
    });
});

/**
 * Scrapes work metadata from public DLsite page HTML.
 * @param {number} id Work id.
 * @param {String} tagLanguage 标签语言，'ja-jp', 'zh-tw' or 'zh-cn'，默认'zh-cn'
 */
const scrapeWorkMetadataFromDLsite = (id, tagLanguage) => new Promise((resolve, reject) => {
  const rjcode = (`000000${id}`).slice(-6);
  const url = `https://www.dlsite.com/maniax/work/=/product_id/RJ${rjcode}.html`;

  const work = { id, tags: [], vas: [] };
  var ageRatings, CV, genre, cookieLocale;
  switch(tagLanguage) {
    case 'ja-jp':
      cookieLocale = 'locale=ja-jp'
      ageRatings = '年齢指定';
      genre = 'ジャンル';
      CV = '声優';
      break;
    case 'zh-tw':
      cookieLocale = 'locale=zh-tw'
      ageRatings = '年齡指定';
      genre = '分類';
      CV = '聲優';
      break;
    default:
      cookieLocale = 'locale=zh-cn'
      ageRatings = '年龄指定';
      genre = '分类';
      CV = '声优';
  }

  Promise.race([fetch(url, {
    headers: { "cookie": cookieLocale } // cookie
  }), new Promise(function(resolve,reject){
    setTimeout(() => reject(new Error('request timeout')), 1000*config.timeout); // timeout 秒
  })]) // HTTP数据请求
    .then((res) => {
      if (res.ok) {
        return res;
      } else {
        reject(new Error(`Couldn't fetch work page HTML, received ${res.statusText}`));
      }
    })
    .then(res => res.text()) // 以string的形式生成请求text
    .then((res) => { // 解析
      // 通过 load 方法把 HTML 代码转换成一个 jQuery 对象，可以使用与 jQuery 一样的语法来操作
      var $ = cheerio.load(res);

      // 标题
      work.title = $('a[href="'+url+'"]').text();

      // 社团
      const circleUrl = $('span[class="maker_name"]').children('a').attr('href');
      const circleName = $('span[class="maker_name"]').children('a').text();
      work.circle = {
        id: parseInt(circleUrl.substr(-10,5)),
        name: circleName
      };

      // NSFW
      const R18 = $('#work_outline').children('tbody').children('tr').children('th')
        .filter(function() {
          return $(this).text() === ageRatings;
        }).parent().children('td').text();
      if (R18 === '18禁') {
        work.nsfw = 'true';
      } else {
        work.nsfw = 'false';
      }

      // 标签
      $('#work_outline').children('tbody').children('tr').children('th')
        .filter(function() {
          return $(this).text() === genre;
        }).parent().children('td').children('div').children('a').each(function() {
          const name = $(this).text();
          const tagUrl = $(this).attr('href');
          work.tags.push({
            id: parseInt(tagUrl.substr(-19,3)),
            name: name
          });
        });

      // 声优
      $('#work_outline').children('tbody').children('tr').children('th')
        .filter(function() {
          return $(this).text() === CV;
        }).parent().children('td').children('a').each(function() {
          const name = $(this).text();
          work.vas.push({
            id: hashNameIntoInt(name),
            name: name
          });
        });
    })
    .then(() => {
      if (work.vas.length === 0) { // 从DLsite抓取不到声优信息
        // 从HVDB抓取声优信息
        scrapeWorkMetadataFromHVDB(id)
          .then((metadata) => {
            if (metadata.vas.length <= 1) { // 不存在日语的声优名
              work.vas = metadata.vas;
            } else { // 有日语的声优名
              metadata.vas.forEach(function(element) {
                if (!hasLetter(element.name)) {
                  work.vas.push(element);
                }
              });
            }

            if (work.tags.length === 0 && work.vas.length === 0) {
              reject(new Error('Couldn\'t parse data from DLsite work page.'));
            } else {
              resolve(work);
            }
          })
          .catch(() => {
            reject(new Error('Couldn\'t parse CV data from HVDB work page.'));
          });
      } else { // 从DLsite抓取到声优信息
        resolve(work);
      }
    })
    .catch((err) => {
      reject(new Error(err.message));
    });
});

/**
 * Scrapes work metadata.
 * @param {number} id Work id.
 * @param {String} tagLanguage 标签语言
 */
const scrapeWorkMetadata = (id, tagLanguage) => {
  if (tagLanguage === 'en-us') {
    return scrapeWorkMetadataFromHVDB(id);
  } else {
    return scrapeWorkMetadataFromDLsite(id, tagLanguage);
  }
};


// const scrapeAllTags = (tagLanguage) => new Promise((resolve, reject) => {
//   const url = 'https://www.dlsite.com/maniax/fs';
//   var tags = [];
//   var cookieLocale;

//   switch(tagLanguage) {
//     case 'ja-jp':
//       cookieLocale = 'locale=ja-jp'
//       break;
//     case 'zh-tw':
//       cookieLocale = 'locale=zh-tw'
//       break;
//     default:
//       cookieLocale = 'locale=zh-cn'
//   }

//   fetch(url, {
//     headers: { "cookie": cookieLocale } // cookie
//   }) // HTTP数据请求
//     .then((res) => {
//       if (res.ok) {
//         return res;
//       } else {
//         reject(new Error(`Couldn't fetch work page HTML, received ${res.statusText}`));
//       }
//     })
//     .then(res => res.text()) // 以 string 的形式生成请求 text
//     .then((res) => { // 解析
//       // 通过 load 方法把 HTML 代码转换成一个 jQuery 对象，可以使用与 jQuery 一样的语法来操作
//       var $ = cheerio.load(res);

//       $('#fs_search').children('fieldset').eq(2)
//         .children('table').children('tbody').children('tr').eq(1)
//         .children('td').children('div')
//         .children('div[class="frame_double_list_box list_triple_row"]')
//         .each(function() {
//           const tagClass = $(this).children('div').children('dl').children('dt')
//             .children('p').children('span').text();

//           $(this).children('div').children('dl').children('dd')
//             .each(function() {
//               const tagId = parseInt($(this).children('label').attr('for').substr(-3,3));
//               const tagName = $(this).children('label').text();

//               tags.push({
//                 id: tagId,
//                 name: tagName,
//                 class: tagClass
//               });
//             });
//         });

//       resolve(tags);

//     })
//     .catch((err) => {
//       reject(new Error(err.message));
//     });
// });

// 模块接口，声明这个模块对外暴露什么内容
module.exports = scrapeWorkMetadata;
