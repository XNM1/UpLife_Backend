const app = require("express")();
const cluster = require("cluster");
const passport = require("app-passport").passport;
const express_session = require("app-passport").express_session;
const config = require("common-modules").config;
const logger = require("logger");
const dgraph_instance = require("dgraph-instance");
const numCPUs = require('os').cpus().length;
const validator = require('validator-mutate');
var moment = require('moment');
const bent = require('bent');

if (cluster.isMaster) {
  // Master code
  logger.info("[" + process.env.NAME + "] server started on " + config.get("services.mutate.port") + " port");

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on("exit", (worker, code, signal) => {
    logger.fatal("[" + process.env.NAME + `][WORKER ${worker.process.pid}] died`);
    cluster.fork();
  });
} else {
  // Worker code
  app.use(express_session);
  app.use(passport.initialize());
  app.use(passport.session());

  const post_notify = bent('http://notify-nginx:91/', 'POST', 'string', 200);

  const author = (req, res, next) => {
    if (req.isAuthenticated()) {
      next();
    } else {
      res.redirect("/fail");
    }
  };

  app.get("/fail", function(req, res) {
    res.send("access denied");
    logger.info("[" + process.env.NAME + "][WORKER: " + cluster.worker.id + "][WITHOUT PERMISSION] ip: " + req.ip + ", params: " + JSON.stringify(req.query) + ", body: " + JSON.stringify(req.body));
  });

  //CHAT
  validator.create_chat.unshift(author);
  app.post("/chat", async function(req, res) {
    try {
      const obj = JSON.parse(req.query.chat);
      obj.uid = "_:" + obj.name;
      if (obj.members === undefined) {
        obj.members = [];
      }
      const user_membership = { uid: req.user.uid };
      if (!obj.members.includes(user_membership)) {
        obj.members.unshift(user_membership);
      }
      if (obj.tags !== undefined) {
        await tags_create(obj.tags);
      }
      const resp = await dgraph_instance.dgraph_connection.mutate(obj);
      res.send("Chat was succesfully created");
      logger.debug("[" + process.env.NAME + "][WORKER: " + cluster.worker.id + `][CREATE][SUCCESS][CHAT] id: ${resp.getUidsMap().get(obj.name)}` + ", name: " + obj.name);
      chat_change_notify(resp.getUidsMap().get(obj.name), "create");
    }
    catch(error) {
      logger.error("[" + process.env.NAME + "][WORKER: " + cluster.worker.id + "][CREATE][FAIL][CHAT] error: " + error);
      res.send("Chat wasn`t created");
    }
  });

  validator.edit_chat.unshift(author);
  app.put("/chat", async function(req, res) {
    try {
      const obj = JSON.parse(req.query.chat);
      if (obj.members === undefined) {
        obj.members = [{ uid: req.user.uid }];
      }
      else {
        await dgraph_instance.dgraph_connection.delete({ uid:obj.uid, members: null });
      }
      if (obj.tags !== undefined) {
        await dgraph_instance.dgraph_connection.delete({ uid:obj.uid, tags: null });
        await tags_create(obj.tags);
      }
      await dgraph_instance.dgraph_connection.mutate(obj);
      res.send("Chat was succesfully edited");
      logger.debug("[" + process.env.NAME + "][WORKER: " + cluster.worker.id + `][EDIT][SUCCESS][CHAT] id: ${obj.uid}` + ", name: " + obj.name);
      chat_change_notify(obj.uid, "edit");
    }
    catch(error) {
      logger.error("[" + process.env.NAME + "][WORKER: " + cluster.worker.id + "][EDIT][FAIL][CHAT] error: " + error);
      res.send("Chat wasn`t edited");
    }
  });

  validator.delete_chat.unshift(author);
  app.delete("/chat", async function(req, res) {
    try {
      const uid = req.query.uid;
      await chat_change_notify(uid, "delete");
      var messages = await messages_get_by_chat_uid(uid);
      await dgraph_instance.dgraph_connection.delete({uid:uid, name: null, backimage: null, members: null, messages: null, tags: null});
      await dgraph_instance.dgraph_connection.delete({uid:uid});
      if (messages !== undefined && messages !== null) {
        await messages_delete(messages);
      }
      res.send("Chat was succesfully deleted");
      logger.debug("[" + process.env.NAME + "][WORKER: " + cluster.worker.id + `][DELETE][SUCCESS][CHAT] id: ${uid}`);
    }
    catch(error) {
      logger.error("[" + process.env.NAME + "][WORKER: " + cluster.worker.id + "][DELETE][FAIL][CHAT] error: " + error);
      res.send("Chat wasn`t deleted");
    }
  });

  //MESSAGE
  app.post("/message", author, async function(req, res) {
    try {
      const obj = JSON.parse(req.query.message);
      const chat_uid = req.query.chat_uid;
      obj.uid = "_:" + obj.text;
      obj.author = { uid: req.user.uid };
      obj.read = false;
      obj.date = moment().format();
      if (obj.tags !== undefined) {
        await tags_create(obj.tags);
      }
      const resp = await dgraph_instance.dgraph_connection.mutate(obj);
      await dgraph_instance.dgraph_connection.mutate( { uid:chat_uid, messages:[{ uid:resp.getUidsMap().get(obj.text)}] } );
      res.send("Message was succesfully created");
      logger.debug("[" + process.env.NAME + "][WORKER: " + cluster.worker.id + `][CREATE][SUCCESS][MESSAGE] id: ${resp.getUidsMap().get(obj.text)}`);
      message_change_notify(resp.getUidsMap().get(obj.text), "create");
    }
    catch(error) {
      logger.error("[" + process.env.NAME + "][WORKER: " + cluster.worker.id + "][CREATE][FAIL][MESSAGE] error: " + error);
      res.send("Message wasn`t created");
    }
  });

  app.put("/message", author, async function(req, res) {
    try {
      const obj = JSON.parse(req.query.message);
      obj.author = { uid: req.user.uid };
      if (obj.tags !== undefined) {
        await dgraph_instance.dgraph_connection.delete({ uid:obj.uid, tags: null });
        await tags_create(obj.tags);
      }
      if (obj.tasks !== undefined) {
        const query = `query all($uid: int) {
          all(func: uid($uid)) {
            tasks {
              uid,
            }
          }
        }`;
        const resp = await dgraph_instance.dgraph_connection.query(query, { $uid: obj.uid });
        if (resp.getJson().all[0] !== undefined) {
          await dgraph_instance.dgraph_connection.delete({ uid:obj.uid, tasks: null });
          await tasks_delete(resp.getJson().all[0].tasks);
        }
      }
      await dgraph_instance.dgraph_connection.mutate(obj);
      res.send("Message was succesfully edited");
      logger.debug("[" + process.env.NAME + "][WORKER: " + cluster.worker.id + `][EDIT][SUCCESS][MESSAGE] id: ${obj.uid}`);
      message_change_notify(obj.uid, "edit");
    }
    catch(error) {
      logger.error("[" + process.env.NAME + "][WORKER: " + cluster.worker.id + "][EDIT][FAIL][MESSAGE] error: " + error);
      res.send("Message wasn`t edited");
    }
  });

  app.delete("/message", author, async function(req, res) {
    try {
      const uid = req.query.message_uid;
      await message_change_notify(uid, "delete");
      const message = await message_get_by_uid(uid);
      await messages_delete([message]);
      res.send("Message was succesfully deleted");
    }
    catch(error) {
      res.send("Message wasn`t deleted");
    }
  });

  app.put("/read", author, async function(req, res) {
    try {
      const message_uid = req.query.message_uid;
      await dgraph_instance.dgraph_connection.mutate({ uid:message_uid, read:true });
      res.send("Message was succesfully readed");
      logger.debug("[" + process.env.NAME + "][WORKER: " + cluster.worker.id + `][READ][SUCCESS][MESSAGE] id: ${message_uid}`);
      message_change_notify(message_uid, 'read');
    }
    catch(error) {
      logger.error("[" + process.env.NAME + "][WORKER: " + cluster.worker.id + "][READ][FAIL][MESSAGE] error: " + error);
      res.send("Message wasn`t readed");
    }
  });

  app.put("/task_change", author, async function(req, res) {
    try {
      const task_uid = req.query.task_uid;
      if (req.query.task_state == "true") {
        var task_state = true;
      }
      else if (req.query.task_state == "false") {
        var task_state = false;
      }
      await dgraph_instance.dgraph_connection.mutate({ uid:task_uid, checked:task_state });
      res.send("Task was succesfully checked");
      logger.debug("[" + process.env.NAME + "][WORKER: " + cluster.worker.id + `][CHECK][SUCCESS][TASK] id: ${task_uid}`);
      task_change_notify(task_uid, task_state);
    }
    catch(error) {
      logger.error("[" + process.env.NAME + "][WORKER: " + cluster.worker.id + "][CHECK][FAIL][TASK] error: " + error);
      res.send("Task wasn`t checked");
    }
  });

  //FRIEND
  app.post("/contact", author, async function(req, res) {
    try {
      const contact_uid = req.query.contact_uid;
      await dgraph_instance.dgraph_connection.mutate({ uid: req.user.uid, contacts: { uid:contact_uid } });
      var query = `query all($uid: int, $uid2: int) {
        all(func: uid($uid)) {
          ~contacts @filter(uid($uid2)) {
            uid
          }
        }
      }`;
      var resp = await dgraph_instance.dgraph_connection.query(query, { $uid: req.user.uid, $uid2: contact_uid});
      if (resp.getJson().all[0] !== null && resp.getJson().all[0] !== undefined && resp.getJson().all[0]["~contacts"][0] !== undefined && resp.getJson().all[0]["~contacts"][0] !== null) {
        res.send("Contact was succesfully added");
        logger.debug("[" + process.env.NAME + "][WORKER: " + cluster.worker.id + `][ADD][SUCCESS][CONTACT] id: ${contact_uid}`);
        contact_req_notify(contact_uid, 'add', req.user.uid);
      }
      else {
        res.send("Contact was succesfully requested");
        logger.debug("[" + process.env.NAME + "][WORKER: " + cluster.worker.id + `][REQUEST][SUCCESS][CONTACT] id: ${contact_uid}`);
        contact_req_notify(contact_uid, 'request', req.user.uid);
      }
    }
    catch(error) {
      logger.error("[" + process.env.NAME + "][WORKER: " + cluster.worker.id + "][ADD][FAIL][CONTACT] error: " + error);
      res.send("Contact wasn`t added");
    }
  });

  app.delete("/contact", author, async function(req, res) {
    try {
      const contact_uid = req.query.contact_uid;
      var query = `query all($uid: int, $uid2: int) {
        all(func: uid($uid)) {
          ~contacts @filter(uid($uid2)) {
            uid
          }
        }
      }`;
      var resp = await dgraph_instance.dgraph_connection.query(query, { $uid: req.user.uid, $uid2: contact_uid});
      if (resp.getJson().all[0] !== null && resp.getJson().all[0] !== undefined && resp.getJson().all[0]["~contacts"][0] !== undefined && resp.getJson().all[0]["~contacts"][0] !== null) {
        await dgraph_instance.dgraph_connection.delete({ uid: contact_uid, contacts: { uid: req.user.uid } });
        await dgraph_instance.dgraph_connection.delete({ uid: req.user.uid, contacts: { uid: contact_uid } });
        res.send("Contact was succesfully deleted");
        logger.debug("[" + process.env.NAME + "][WORKER: " + cluster.worker.id + `][DELETE][SUCCESS][CONTACT] id: ${contact_uid}`);
        contact_req_notify(contact_uid, 'delete', req.user.uid);
      }
      else {
        await dgraph_instance.dgraph_connection.delete({ uid: req.user.uid, contacts: { uid: contact_uid } });
        res.send("Contact was succesfully request canceled");
        logger.debug("[" + process.env.NAME + "][WORKER: " + cluster.worker.id + `][REQ_CANCEL][SUCCESS][CONTACT] id: ${contact_uid}`);
        contact_req_notify(contact_uid, 'request_cancel', req.user.uid);
      }
    }
    catch(error) {
      logger.error("[" + process.env.NAME + "][WORKER: " + cluster.worker.id + "][DELETE][FAIL][CONTACT] error: " + error);
      res.send("Contact wasn`t deleted");
    }
  });

  app.delete("/contact/reject", author, async function(req, res) {
    try {
        const contact_uid = req.query.contact_uid;
        await dgraph_instance.dgraph_connection.delete({ uid: contact_uid, contacts: { uid: req.user.uid } });
        res.send("Contact was succesfully rejected");
        logger.debug("[" + process.env.NAME + "][WORKER: " + cluster.worker.id + `][REJECT][SUCCESS][CONTACT] id: ${contact_uid}`);
        contact_req_notify(contact_uid, 'reject', req.user.uid);
    }
    catch(error) {
      logger.error("[" + process.env.NAME + "][WORKER: " + cluster.worker.id + "][REJECT][FAIL][CONTACT] error: " + error);
      res.send("Contact wasn`t rejected");
    }
  });

  //FILTER
  validator.create_filter.unshift(author);
  app.post("/filter", async function(req, res) {
    try {
      const obj = JSON.parse(req.query.filter);
      obj.uid = "_:" + obj.name;
      obj.author = { uid: req.user.uid };
      obj.backimage = "";
      await tags_create(obj.tags);
      const resp = await dgraph_instance.dgraph_connection.mutate(obj);
      res.send("Filter was succesfully created");
      logger.debug("[" + process.env.NAME + "][WORKER: " + cluster.worker.id + `][CREATE][SUCCESS][FILTER] id: ${resp.getUidsMap().get(obj.name)}` + ", name: " + obj.name);
    }
    catch(error) {
      logger.error("[" + process.env.NAME + "][WORKER: " + cluster.worker.id + "][CREATE][FAIL][FILTER] error: " + error);
      res.send("Filter wasn`t created");
    }
  });

  validator.edit_filter.unshift(author);
  app.put("/filter", async function(req, res) {
    try {
      const obj = JSON.parse(req.query.filter);
      await dgraph_instance.dgraph_connection.delete({ uid:obj.uid, tags: null });
      await tags_create(obj.tags);
      await dgraph_instance.dgraph_connection.mutate(obj);
      res.send("Filter was succesfully edited");
      logger.debug("[" + process.env.NAME + "][WORKER: " + cluster.worker.id + `][EDIT][SUCCESS][FILTER] id: ${obj.uid}` + ", name: " + obj.name);
    }
    catch(error) {
      logger.error("[" + process.env.NAME + "][WORKER: " + cluster.worker.id + "][EDIT][FAIL][FILTER] error: " + error);
      res.send("Filter wasn`t edited");
    }
  });

  validator.delete_filter.unshift(author);
  app.delete("/filter", async function(req, res) {
    try {
      const uid = req.query.uid;
      await dgraph_instance.dgraph_connection.delete({uid: uid, name: null, backimage: null, tags: null, author: null});
      await dgraph_instance.dgraph_connection.delete({uid: uid});
      logger.debug("[" + process.env.NAME + "][WORKER: " + cluster.worker.id + `][DELETE][SUCCESS][FILTER] id: ${uid}`);
      res.send("Filter was succesfully deleted");
    }
    catch(error) {
      logger.error("[" + process.env.NAME + "][WORKER: " + cluster.worker.id + "][DELETE][FAIL][FILTER] error: " + error);
      res.send("Filter wasn`t deleted");
    }
  });


  //SPEC FUNCTIONS
  async function tags_create(tags) {
    for(var tag of tags) {
      const query = `query all($name: string) {
          all(func: eq(name, $name)) {
              uid,
              name
          }
      }`;
      const resp = await dgraph_instance.dgraph_connection.query(query, { $name: tag.name });
      if (resp.getJson().all[0] !== undefined && tag.name === resp.getJson().all[0].name) {
        tag.uid = resp.getJson().all[0].uid;
      }
    }
  }

  async function messages_get_by_chat_uid(chat_uid) {
    const query = `query all($uid: int) {
      all(func: uid($uid)) {
          messages {
            uid,
            tasks {
              uid
            }
          }
      }
    }`;
    const resp = await dgraph_instance.dgraph_connection.query(query, { $uid: chat_uid });
    return resp.getJson().all[0].messages;
  }

  async function message_get_by_uid(message_uid) {
    const query = `query all($uid: int) {
      all(func: uid($uid)) {
          uid,
          tasks {
            uid
          }
      }
    }`;
    const resp = await dgraph_instance.dgraph_connection.query(query, { $uid: message_uid });
    return resp.getJson().all[0];
  }


  async function messages_delete(messages) {
    for (const m of messages) {
      try {
        await dgraph_instance.dgraph_connection.delete({uid:m.uid, text: null, date: null, notify_date: null, read: null, author: null, tasks: null, tags: null});
        const query = `query all($uid: int) {
          all(func: uid($uid)) {
            ~messages {
             uid
           }
         }
        }`;
        const resp = await dgraph_instance.dgraph_connection.query(query, { $uid: m.uid });
        if (resp.getJson().all[0] !== undefined) {
          await dgraph_instance.dgraph_connection.delete({uid:resp.getJson().all[0]["~messages"][0].uid, messages: {uid: m.uid}});
        }
        await dgraph_instance.dgraph_connection.delete({uid:m.uid});
        if (m.tasks !== undefined) {
          await tasks_delete(m.tasks);
        }
        logger.debug("[" + process.env.NAME + "][WORKER: " + cluster.worker.id + `][DELETE][SUCCESS][MESSAGE] id: ${m.uid}`);
      }
      catch(error) {
        logger.error("[" + process.env.NAME + "][WORKER: " + cluster.worker.id + "][DELETE][FAIL][MESSAGE] error: " + error);
      }
    }
  }

  async function tasks_delete(tasks) {
    for (const t of tasks) {
      try {
        await dgraph_instance.dgraph_connection.delete({uid:t.uid, text: null, checked: null });
        await dgraph_instance.dgraph_connection.delete({uid:t.uid});
        logger.debug("[" + process.env.NAME + "][WORKER: " + cluster.worker.id + `][DELETE][SUCCESS][TASK] id: ${t.uid}`);
      }
      catch(error) {
        logger.error("[" + process.env.NAME + "][WORKER: " + cluster.worker.id + "][DELETE][FAIL][TASK] error: " + error);
      }
    }
  }

  //NOTIFY
  async function chat_change_notify(uid, type) {
    const query = `query all($uid: int) {
      all(func: uid($uid)) {
        members {
         uid
       }
     }
    }`;
    const resp = await dgraph_instance.dgraph_connection.query(query, { $uid: uid });
    if (resp.getJson().all[0] !== undefined) {
      var members = resp.getJson().all[0].members;
      if (members !== undefined && members.length > 1) {
        console.log("chat/change?members=" + JSON.stringify(members) + "&type=" + type+"&chat_uid="+uid);
        await post_notify("chat/change?members=" + JSON.stringify(members) + "&type=" + type+"&chat_uid="+uid);
      }
    }
  }

  async function message_change_notify(uid, type) {
    var query = `query all($uid: int) {
      all(func: uid($uid)) {
        ~messages {
         uid
       }
     }
    }`;
    var resp = await dgraph_instance.dgraph_connection.query(query, { $uid: uid });
    if (resp.getJson().all[0] !== undefined) {
      var chat_uid = resp.getJson().all[0]["~messages"][0].uid;

      query = `query all($uid: int) {
        all(func: uid($uid)) {
          members {
           uid
         }
       }
      }`;
      resp = await dgraph_instance.dgraph_connection.query(query, { $uid: chat_uid });
      if (resp.getJson().all[0] !== undefined) {
        var members = resp.getJson().all[0].members;
        if (members !== undefined && members.length > 1) {
          await post_notify('message/change?members=' + JSON.stringify(members) + '&type=' + type+'&chat_uid='+chat_uid+'&message_uid='+uid);
        }
      }
    }
  }

  async function contact_req_notify(uid, type, user_uid) {
    await post_notify("contact/change?contact_uid=" + uid + "&type=" + type+"&user_uid="+user_uid);
  }

  async function task_change_notify(uid, state) {
    var query = `query all($uid: int) {
      all(func: uid($uid)) {
        ~tasks {
         uid
       }
     }
    }`;
    var resp = await dgraph_instance.dgraph_connection.query(query, { $uid: uid });
    if (resp.getJson().all[0] !== undefined) {
      var message_uid = resp.getJson().all[0]["~tasks"][0].uid;
      message_change_notify(message_uid, 'task_change&state='+state+'&task_uid='+uid);
    }
  }

  app.listen(config.get("services.mutate.port"));
  logger.info("[" + process.env.NAME + "][WORKER: " + cluster.worker.id + "] started");
}