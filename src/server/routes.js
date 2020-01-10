const path = require('path');
const express = require('express'); // Web 应用框架

const db = require('./database/db');
const { getTrackList } = require('./filesystem/utils');

const config = require(process.cwd() + '/config.json');

const router = express.Router(); // 创建路由实例，可以在该实例上添加路由

/**
 * 请求和响应:
 *   Express 应用使用回调函数的参数: request 和 response 对象来处理请求和响应的数据。
 *     request 对象表示 HTTP 请求，response 对象表示 HTTP 响应。
 *
 * 路由:
 *   使应用可以通过请求的 URL 路径区别不同请求。
 */

// 添加路由
// GET work cover image
// 封面图片
router.get('/cover/:id', (req, res, next) => {
  const rjcode = (`000000${req.params.id}`).slice(-6);
  res.sendFile(path.join(config.rootDir, 'Images', `RJ${rjcode}.jpg`), (err) => {
    if (err) {
      res.sendFile(path.join(__dirname, '..', '..', 'static', 'no-image.jpg'), (err2) => {
        if (err2) {
          next(err2);
        }
      });
    }
  });
});

// 添加路由
// GET work metadata
// 作品元数据 (id: 作品id)
router.get('/work/:id', (req, res, next) => {
  db.getWorkMetadata(req.params.id)
    .then(work => res.send(work))
    .catch(err => next(err));
});

// 添加路由
// GET track list in work folder
// 作品的可播放文件列表 (id: 作品id)
router.get('/tracks/:id', (req, res, next) => {
  db.knex('t_work')
    .select('dir')
    .where('id', '=', req.params.id)
    .first()
    .then((dir) => {
      getTrackList(req.params.id, dir.dir)
        .then(tracks => res.send(tracks));
    })
    .catch(err => next(err));
});

// 添加路由
// GET (stream) a specific track from work folder
// 作品的第 index 个可播放文件 (id: 作品id)
router.get('/stream/:id/:index', (req, res, next) => {
  db.knex('t_work')
    .select('dir')
    .where('id', '=', req.params.id)
    .first()
    .then((dir) => {
      getTrackList(req.params.id, dir.dir)
        .then((tracks) => {
          const track = tracks[req.params.index];
          res.sendFile(path.join(config.rootDir, dir.dir, track.subtitle || '', track.title));
        })
        .catch(err => next(err));
    });
});

// 添加路由
// GET list of work ids
// id 小于 fromId 的所有作品的id列表
router.get('/works/:fromId?', (req, res, next) => {
  db.paginateResults(db.getWorksBy(), req.params.fromId || 999999, config.worksPerPage)
    .then(results => res.send(results))
    .catch(err => next(err));
});

// 添加路由
// GET name of a circle/tag/VA
// 根据 id 在 t_${field} 表中查询 name
router.get('/get-name/:field/:id', (req, res, next) => {
  if (req.params.field === 'undefined') {
    return res.send(null);
  }

  return db.knex(`t_${req.params.field}`)
    .select('name')
    .where('id', '=', req.params.id)
    .first()
    .then(name => res.send(name.name))
    .catch(err => next(err));
});

// 添加路由
// GET list of work ids, restricted by circle/tag/VA
// 含有指定 circle/tag/VA，且 id 小于 fromId 的所有作品的id列表
router.get('/:field/:id/:fromId?', (req, res, next) => {
  db.paginateResults(
    db.getWorksBy(req.params.id, req.params.field),
    req.params.fromId || 999999, config.worksPerPage,
  )
    .then(results => res.send(results))
    .catch(err => next(err));
});

// 添加路由
// GET list of circles/tags/VAs
router.get('/(:field)s/', (req, res, next) => {
  db.knex(`t_${req.params.field}`)
    .select('id', 'name')
    .orderBy('name', 'asc')
    .then(list => res.send(list))
    .catch(err => next(err));
});

// 模块接口，声明这个模块对外暴露什么内容
module.exports = router;
