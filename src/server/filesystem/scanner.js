/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch'); // HTTP数据请求
const LimitPromise = require('limit-promise'); // 限制并发数量

const db = require('../database/db');
const { getFolderList, deleteCoverImageFromDisk, saveCoverImageToDisk } = require('./utils');
const { createSchema } = require('../database/schema');
const scrapeWorkMetadata = require('../metadata');

const config = require(process.cwd() + '/config.json');


/**
 * 检查文件是否存在，
 * 返回一个 Promise 对象
 * @param {string} filePath 文件路径
 */
const isFileExisted = (filePath) => {
  return new Promise(function(resolve, reject) {
    fs.exists(filePath, (exists) => {
      if (exists) {
        resolve(true);
      } else {
        resolve(false);
      }
    })
  });
};

/**
 * 通过数组 arr 中每个对象的 id 属性来对数组去重
 * 返回去重后的数组，成员为重复id的数组
 * @param {Array} arr 
 */
const uniqueArr = (arr) => {
  const hash = [];
  const duplicateID = [];

  for (var i=0; i<arr.length; i++) {
    for (var j=i+1; j<arr.length; j++) {
      if (arr[i].id === arr[j].id) {
        duplicateID.push(arr[i].id);
        ++i;
      }
    }
      hash.push(arr[i]);
  }
  
  const s = new Set(); // 数据结构 Set，它类似于数组，但是成员的值都是唯一的，没有重复的值
  duplicateID.forEach(x => s.add(x));
  const arry = Array.from(s); // set 转数组

  return {
    uniquedArr: hash,
    duplicateIDArr: arry
  };
};

/**
 * 从 DLsite 或 HVDB 抓取该作品的元数据，并保存到数据库，
 * 返回一个 Promise 对象，处理结果: 'added' or 'failed'
 * @param {number} id work id
 * @param {string} folder 文件夹相对路径
 * @param {string} tagLanguage 标签语言，'ja-jp', 'zh-tw' or 'zh-cn'，默认'zh-cn'
 */
const getMetadata = (id, folder, tagLanguage) => {
  const rjcode = (`000000${id}`).slice(-6); // zero-pad to 6 digits
  return scrapeWorkMetadata(id, tagLanguage) // 抓取该作品的元数据
      .then((metadata) => {
        // 将该作品的元数据插入到数据库
        //console.log(` -> [RJ${rjcode}] Fetched metadata! Adding to database...`);
        metadata.dir = folder;
        return db.insertWorkMetadata(metadata)
          //.then(console.log(` -> [RJ${rjcode}] Finished adding to the database!`))
          .then(() => 'added');
      })
      .catch((err) => {
        //console.log(`  ! [RJ${rjcode}] Failed to fetch metadata: ${err.message}`);
        return 'failed';
      });
};

/**
 * 从 HVDB 或 DLsite 下载封面图片，并保存到 Images 文件夹，
 * 返回一个 Promise 对象，处理结果: 'added' or 'failed'
 * @param {number} id work id
 * @param {string} coverSource 封面图片源，'HVDB' or 'DLsite'，默认'DLsite'
 */
const getCoverImage = (id, coverSource) => {
  const rjcode = (`000000${id}`).slice(-6); // zero-pad to 6 digits
  if (coverSource === "HVDB") {
    //console.log(` -> [RJ${rjcode}] Downloading cover image from HVDB...`);
    coverUrl = `https://hvdb.me/WorkImages/RJ${rjcode}.jpg`;
  } else { // 默认从 DLsite 下载封面图片
    //console.log(` -> [RJ${rjcode}] Downloading cover image from DLsite...`);
    if ( id.toString().substr(-3,3) === '000'){
      coverUrl = `https://img.dlsite.jp/modpub/images2/work/doujin/RJ${rjcode}/RJ${rjcode}_img_main.jpg`;
    } else {
      coverUrl = `https://img.dlsite.jp/modpub/images2/work/doujin/RJ${(`000000${id.toString() - id.toString().substr(-3,3) + 1000}`).slice(-6)}/RJ${rjcode}_img_main.jpg`;
    }
  }

  return Promise.race([fetch(coverUrl), new Promise(function(resolve,reject){
    setTimeout(() => reject(new Error('request timeout')), 1000*config.timeout); // timeout 秒
  })]) 
    .then((imageRes) => {
      if (!imageRes.ok) {
        throw new Error(imageRes.statusText);
      }
      return imageRes;
    })
    .then((imageRes) => {
      return saveCoverImageToDisk(imageRes.body, rjcode)
        //.then(() => console.log(` -> [RJ${rjcode}] Cover image downloaded!`))
        .then(() => 'added');
    })
    .catch((err) => {
      //console.log(`  ! [RJ${rjcode}] Failed to download cover image: ${err.message}`);
      return 'failed';
    });
};

/**
 * 获取作品元数据，获取作品封面图片，
 * 返回一个 Promise 对象，处理结果: 'added', 'skipped' or 'failed'
 * @param {number} id work id
 * @param {string} folder 文件夹相对路径
 * @param {string} tagLanguage 标签语言，'ja-jp', 'zh-tw' or 'zh-cn'，默认'zh-cn'
 * @param {string} coverSource 封面图片源，'HVDB' or 'DLsite'，默认'DLsite'
 */
const processFolder = (id, folder, tagLanguage, coverSource) => db.knex('t_work')
  .where('id', '=', id) // select * from 't_work' where 'id' = id
  .count()
  .first()
  .then((res) => {
    const rjcode = (`000000${id}`).slice(-6); // zero-pad to 6 digits
    const processResult = {
      metadata: '', 
      coverImage: '' 
    };
    
    const count = res['count(*)'];
    if (count) { // 查询数据库，检查是否已经写入该作品的元数据
      // 已经成功写入元数据
      processResult.metadata = 'skipped';
   
      // 检查作品封面图片是否缺失
      coverPath = path.join(config.rootDir, 'Images', `RJ${rjcode}.jpg`);
      return isFileExisted(coverPath)
        .then((exists) => {
          if (!exists) { // 封面图片缺失，重新下载封面图片
            //console.log(`  ! [RJ${rjcode}] Cover image missing.`);
            return getCoverImage(id, coverSource)
              .then((result) => {
                processResult.coverImage = result;
                return processResult;
              });
          } else { // 封面图片已存在，跳过下载
            processResult.coverImage = 'skipped';
            return processResult;
          }
        });
    } else { // 发现新文件夹
      //console.log(` * Found new folder: ${folder}`);
      //console.log(` -> [RJ${rjcode}] Fetching metadata...`);
      return getMetadata(id, folder, tagLanguage) // 获取元数据
        .then((result) => {
          processResult.metadata = result;
          if (result === 'failed') { // 如果获取元数据失败，跳过封面图片下载
            processResult.coverImage = 'skipped';
            return processResult;
          } else { // 下载封面图片
            return getCoverImage(id, coverSource)
              .then((result) => {
                processResult.coverImage = result;
                return processResult;
              });
          }
        });
    }
  });

/**
 * 获取作品元数据，获取作品封面图片，
 * 返回一个 Promise 对象，处理结果: 'added', 'skipped' or 'failed'，
 * 在处理结果为 'failed' 时重试
 * @param {number} id Work id.
 * @param {string} folder 文件夹相对路径
 * @param {string} tagLanguage 标签语言，'ja-jp', 'zh-tw' or 'zh-cn'，默认'zh-cn'
 * @param {string} coverSource 封面图片源，'HVDB' or 'DLsite'，默认'DLsite'
 * @param {number} retries 最大尝试次数
 */
const retryProcessFolder = async (id, folder, tagLanguage, coverSource, retries) => {
  const rjcode = (`000000${id}`).slice(-6); // zero-pad to 6 digits
  return processFolder(id, folder, tagLanguage, coverSource)
    .then((processResult) => {
      if ((processResult.coverImage === 'failed' || processResult.metadata === 'failed') && retries > 1) {
        //console.log(`  ! [RJ${rjcode}] Retry...`);
        return retryProcessFolder(id, folder, tagLanguage, coverSource, retries-1);
      } else {
        return processResult;
      }
  });
};
 
const MAX = config.maxParallelism; // 并发请求上限
const limitP = new LimitPromise(MAX); // 核心控制器
/**
 * 限制 processFolder 并发数量，
 * 使用控制器包装 processFolder 方法，实际上是将请求函数递交给控制器处理
 * @param {number} id Work id.
 * @param {string} folder 文件夹相对路径
 */
const processFolderLimited = (id, folder) => {
  return limitP.call(retryProcessFolder, id, folder, config.tagLanguage, config.coverSource, config.retries);
};

/**
 * performCleanup()
 * 清理本地不再存在的音声: 将其元数据从数据库中移除，并删除其封面图片
 */
const performCleanup = () => {
  //console.log(' * Looking for folders to clean up...');
  return db.knex('t_work')
    .select('id', 'dir')
    .then((works) => {
      const promises = works.map(work => new Promise((resolve, reject) => { // 对work数组内的每一项，都新建一个Promise
        // 检查每个音声的本地路径是否仍然存在，若不再存在，将其数据项从数据库中移除，然后删除其封面图片。
        if (!fs.existsSync(path.join(config.rootDir, work.dir))) {
          //console.warn(` ! ${work.dir} is missing from filesystem. Removing from database...`);
          db.removeWork(work.id) // 将其数据项从数据库中移除
            .then((result) => { // 然后删除其封面图片
              const rjcode = (`000000${work.id}`).slice(-6); // zero-pad to 6 digits
              deleteCoverImageFromDisk(rjcode)    
                .catch(() => console.log(` -> [RJ${rjcode}] Failed to delete cover image.`))
                .then(() => resolve(result));
            })
            .catch(err => reject(err));
        } else {
          resolve();
        }
      }));

      return Promise.all(promises);
    });
};

/**
 * performScan()
 * 执行扫描
 * @param {object} io socket.io 实例
 */
const performScan = (io) => {
  // 在rootDir路径下创建Images文件夹
  fs.mkdir(path.join(config.rootDir, 'Images'), (direrr) => {
    if (direrr && direrr.code !== 'EEXIST') {
      console.error(` ! ERROR while trying to create Images folder: ${direrr.code}`);
      io.emit('scan log', [{result: 'failed', detail: `! ERROR while trying to create Images folder: ${direrr.code}`}]);
      //process.exit(1);
      return 'ERROR while trying to create Images folder.';
    }

    return createSchema() // 构建数据库结构
      .then(() => performCleanup()) // 清理本地不再存在的音声
      .catch((err) => {
        console.error(` ! ERROR while performing cleanup: ${err.message}`);
        //process.exit(1);
      })
      .then(async () => {
        console.log(' * Finished cleanup. Starting scan...');
        io.emit('scan log', [{result: 'start', detail: '* Finished cleanup. Starting scan...'}]);
        const RJfolder = [];

        try {
          // 遍历异步生成器函数 getFolderList()
          for await (const folder of getFolderList()) {
            const id = folder.match(/RJ(\d{6})/)[1];
            RJfolder.push({
              id: id,
              folderDir: folder
            });
          }
        } catch (err) {
          console.error(` ! ERROR while trying to get folder list: ${err.message}`);
          //process.exit(1);
        }

        if (RJfolder.length === 0) { // 当库中没有名称包含 RJ 号的文件夹时
          console.log(' * Finished scan. Added 0, skipped 0 and failed to add 0 works.');
          io.emit('scan log', [{result: 'finished', detail: '* Finished scan. Added 0, skipped 0 and failed to add 0 works.'}]);
          //process.exit(1);
          return 'finished';
        }

        try {
          var processedNum = 0;
          const counts = {
            added: 0,
            failed: 0,
            skipped: 0,
          };

          // 去重，避免在之后的并行处理文件夹过程中，出现数据库同时写入同一个记录的错误。
          const uniqueRJfolder = uniqueArr(RJfolder).uniquedArr;
          const duplicateRJcode = uniqueArr(RJfolder).duplicateIDArr.map((id) => {
            const rjcode = (`000000${id}`).slice(-6); // zero-pad to 6 digits
            return 'RJ' + rjcode;
          });
          const duplicateNum = RJfolder.length - uniqueRJfolder.length;

          counts['skipped'] += duplicateNum;
          if (duplicateNum > 0) {
            console.log(` * Found ${duplicateNum} duplicate folders : ${duplicateRJcode.join(", ")}`);
            io.emit('scan log', [{result: 'skipped', detail: `* Found ${duplicateNum} duplicate folders : ${duplicateRJcode.join(", ")}`}]);
          }
          
          // 并行处理文件夹
          for(i=0; i<uniqueRJfolder.length; i++){
            const id = uniqueRJfolder[i].id;
            const folder = uniqueRJfolder[i].folderDir;

            processFolderLimited(id, folder)
              .then((processResult) => { // 统计处理结果
                const rjcode = (`000000${id}`).slice(-6); // zero-pad to 6 digits

                if(processResult.metadata === 'failed' || processResult.coverImage === 'failed') {
                  counts['failed'] += 1;
                  console.log(`[RJ${rjcode}] Failed adding to the database! Failed: ${counts.failed}.`);
                  io.emit('scan log', [{result: 'failed', detail: `[RJ${rjcode}] Failed adding to the database! Failed: ${counts.failed}.`}]);

                } else if (processResult.metadata === 'skipped' && processResult.coverImage === 'skipped') {
                  counts['skipped'] += 1;

                } else {
                  counts['added'] += 1;
                  console.log(`[RJ${rjcode}] Finished adding to the database! Added: ${counts.added}`);
                  io.emit('scan log', [{result: 'added', detail: `[RJ${rjcode}] Finished adding to the database! Added: ${counts.added}`}]);
                }
                
                processedNum += 1;
                if (processedNum >= uniqueRJfolder.length) {
                  console.log(` * Finished scan. Added ${counts.added}, skipped ${counts.skipped} and failed to add ${counts.failed} works.`);
                  io.emit('scan log', [{result: 'finished', detail: `* Finished scan. Added ${counts.added}, skipped ${counts.skipped} and failed to add ${counts.failed} works.`}]);
                }
              });
          }
        } catch (err) {
          console.error(` ! ERROR while performing scan: ${err.message}`);
          //process.exit(1);
        }
      })
      .catch((err) => {
        console.error(` ! ERROR while creating database schema: ${err.message}`);
        //process.exit(1);
      });
  });
};


// 模块接口，声明这个模块对外暴露什么内容
module.exports = { performScan };