const logger = require("logger");
const dgraph_instance = require("dgraph-instance");
const faker = require("faker");
const formidable = require("formidable");
const cluster = require("cluster");
const fs = require('fs');

module.exports = {
    upload_misc_backimage(req, res, misc_type, uid) {
        const filename = faker.internet.password() + faker.internet.password();

        var form = new formidable.IncomingForm({ multiples: true, maxFileSize: 100 * 1024 * 1024 });
        form.parse(req);
    
        form.onPart = function (part) {
          if(part.filename && part.filename.match(/\.(jpg|jpeg|png|gif)$/i)) {
            this.handlePart(part);
          }
          else {
            res.send('file extension error: ' + part.filename + " (backimage) is not allowed");
            logger.info("[" + process.env.NAME + "][WORKER: " + cluster.worker.id + "][UPLOADING][BACKIMAGE][FAIL START] upload " + part.filename + " is not allowed");
          }
        }
    
        form.on('fileBegin', function (name, file) {
            try {
              logger.info("[" + process.env.NAME + "][WORKER: " + cluster.worker.id + "][UPLOADING][BACKIMAGE][START] upload " + file.name);
              if(!fs.existsSync(__dirname + '/../../data/'+misc_type+'/'))                    fs.mkdirSync(__dirname + '/../../data/'+misc_type+'/');
              if(!fs.existsSync(__dirname + '/../../data/'+misc_type+'/'+uid+'/'))            fs.mkdirSync(__dirname + '/../../data/'+misc_type+'/'+uid+'/');
              if(!fs.existsSync(__dirname + '/../../data/'+misc_type+'/'+uid+'/backimages/')) fs.mkdirSync(__dirname + '/../../data/'+misc_type+'/'+uid+'/backimages/');
              const extension = '.' + file.name.split('.')[1];
              file.path = __dirname + '/../../data/'+misc_type+'/'+uid+'/backimages/' + filename + extension;
            }
            catch (error) {
              res.send('error start upload ' + file.name + " (backimage)");
              logger.error("[" + process.env.NAME + "][WORKER: " + cluster.worker.id + "][UPLOADING][BACKIMAGE][START][FAIL] upload " + file.name + ", error: " + error);
            }
        });
    
        form.on('file', async function (name, file) {
            try {
              const query = `query all($uid: int) {
                all(func: uid($uid)) {
                    backimage
                  }
                }`;
              const resp = await dgraph_instance.dgraph_connection.query(query, { $uid: uid });
              if(fs.existsSync(__dirname + '/../../data/'+misc_type+'/'+uid+'/backimages/') && resp.getJson().all[0] !== undefined && resp.getJson().all[0].backimage !== undefined && resp.getJson().all[0].backimage !== "") fs.unlinkSync(__dirname + '/../../data/'+misc_type+'/'+uid+'/backimages/' + resp.getJson().all[0].backimage);
              const data = {};
              data.uid = uid;
              const extension = '.' + file.name.split('.')[1];
              data.backimage = filename + extension;
              await dgraph_instance.dgraph_connection.mutate(data);
    
              res.send('uploaded ' + file.name + " (backimage)");
              logger.info("[" + process.env.NAME + "][WORKER: " + cluster.worker.id + "][UPLOADING][BACKIMAGE][END] upload " + file.name);
            }
            catch (error) {
              res.send('error end upload ' + file.name + " (backimage)");
              logger.error("[" + process.env.NAME + "][WORKER: " + cluster.worker.id + "][UPLOADING][BACKIMAGE][END][FAIL] upload " + file.name + ", error: " + error);
            }
        });
    
        form.on('error', (err) => {
          res.send('upload backimage failed');
          logger.error("[" + process.env.NAME + "][WORKER: " + cluster.worker.id + "][UPLOADING][BACKIMAGE][FAIL] upload file, error: " + err);
        });
    
        form.on('aborted', () => {
          res.send('upload backimage aborted');
          logger.debug("[" + process.env.NAME + "][WORKER: " + cluster.worker.id + "][UPLOADING][BACKIMAGE][ABORTED] upload file");
        });
    }
}