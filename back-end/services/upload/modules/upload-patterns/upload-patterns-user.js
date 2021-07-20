const logger = require("logger");
const dgraph_instance = require("dgraph-instance");
const faker = require("faker");
const formidable = require("formidable");
const cluster = require("cluster");
const fs = require('fs');

module.exports = {
    upload_user_data(req, res, data) {
        const filename = faker.internet.password() + faker.internet.password();

        var form = new formidable.IncomingForm({ multiples: true, maxFileSize: 100 * 1024 * 1024 });
        form.parse(req);
    
        form.onPart = function (part) {
          if(part.filename && part.filename.match(/\.(jpg|jpeg|png|gif)$/i)) {
            this.handlePart(part);
          }
          else {
            res.send('file extension error: ' + part.filename + " ("+ data +") is not allowed");
            logger.info("[" + process.env.NAME + "][WORKER: " + cluster.worker.id + "][UPLOADING]["+data.toUpperCase()+"][FAIL START] upload " + part.filename + " is not allowed");
          }
        }
    
        form.on('fileBegin', function (name, file) {
            try {
              logger.info("[" + process.env.NAME + "][WORKER: " + cluster.worker.id + "][UPLOADING]["+data.toUpperCase()+"][START] upload " + file.name);
              if(!fs.existsSync(__dirname + '/../../data/users/'))                            fs.mkdirSync(__dirname + '/../../data/users/');
              if(!fs.existsSync(__dirname + '/../../data/users/'+req.user.uid+'/'))           fs.mkdirSync(__dirname + '/../../data/users/'+req.user.uid+'/');
              if(!fs.existsSync(__dirname + '/../../data/users/'+req.user.uid+'/'+data+'s/')) fs.mkdirSync(__dirname + '/../../data/users/'+req.user.uid+'/'+data+'s/');
              const extension = '.' + file.name.split('.')[1];
              file.path = __dirname + '/../../data/users/'+req.user.uid+'/'+data+'s/' + filename + extension;
            }
            catch (error) {
              res.send('error start upload ' + file.name + " ("+data+")");
              logger.error("[" + process.env.NAME + "][WORKER: " + cluster.worker.id + "][UPLOADING]["+data.toUpperCase()+"][START][FAIL] upload " + file.name + ", error: " + error);
            }
        });
    
        form.on('file', async function (name, file) {
            try {
              if(fs.existsSync(__dirname + '/../../data/users/'+req.user.uid+'/'+data+'s/') && req.user[data] !== undefined) fs.unlinkSync(__dirname + '/../../data/users/'+req.user.uid+'/'+data+'s/' + req.user[data]);
              const user = {};
              user.uid = req.user.uid;
              const extension = '.' + file.name.split('.')[1];
              user[data] = filename + extension;
              const resp = await dgraph_instance.dgraph_connection.mutate(user);
    
              res.send('uploaded ' + file.name + " ("+data+")");
              logger.info("[" + process.env.NAME + "][WORKER: " + cluster.worker.id + "][UPLOADING]["+data.toUpperCase()+"][END] upload " + file.name);
            }
            catch (error) {
              res.send('error end upload ' + file.name + " ("+data+")");
              logger.error("[" + process.env.NAME + "][WORKER: " + cluster.worker.id + "][UPLOADING]["+data.toUpperCase()+"][END][FAIL] upload " + file.name + ", error: " + error);
            }
        });
    
        form.on('error', (err) => {
          res.send('upload '+data+' failed');
          logger.error("[" + process.env.NAME + "][WORKER: " + cluster.worker.id + "][UPLOADING]["+data.toUpperCase()+"][FAIL] upload file, error: " + err);
        });
    
        form.on('aborted', () => {
          res.send('upload '+data+' aborted');
          logger.debug("[" + process.env.NAME + "][WORKER: " + cluster.worker.id + "][UPLOADING]["+data.toUpperCase()+"][ABORTED] upload file");
        });
    }
}