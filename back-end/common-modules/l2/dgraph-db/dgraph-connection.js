const dgraph = require("dgraph-js");
const grpc = require("grpc");

module.exports = class DgraphConnection {
  constructor(hosts, is_debug = false) {
    this._clientStubs = [];
    for(const host of hosts) {
      this._clientStubs.push(new dgraph.DgraphClientStub(
        host,
        grpc.credentials.createInsecure(),
      ));
    }
    this._dgraphClient = new dgraph.DgraphClient(...this._clientStubs);
    this._dgraphClient.setDebugMode(is_debug);
  }

  async set_schema(schema) {
    const op = new dgraph.Operation();
    op.setSchema(schema);
    await this._dgraphClient.alter(op);
  }

  async drop_all() {
    const op = new dgraph.Operation();
    op.setDropAll(true);
    await this._dgraphClient.alter(op);
  }

  async mutate(object) {
    const txn = this._dgraphClient.newTxn();
    try {
      const mu = new dgraph.Mutation();
      mu.setSetJson(object);
      const res = await txn.mutate(mu);
      await txn.commit();
      return res;
    }
    catch(error) {
      throw error;
    }
    finally {
      await txn.discard();
    }
  }

  async delete(object) {
    const txn = this._dgraphClient.newTxn();
    try {
      const mu = new dgraph.Mutation();
      mu.setDeleteJson(object);
      const res = await txn.mutate(mu);
      await txn.commit();
      return res;
    }
    catch(error) {
      throw error;
    }
    finally {
      await txn.discard();
    }
  }

  async query(query, vars) {
    const txn = this._dgraphClient.newTxn();
    try {
      return await txn.queryWithVars(query, vars);
    }
    catch(error) {
      throw error;
    }
    finally {
      await txn.discard();
    }
  }

  close_connections() {
    for(stub in this._clientStubs) {
      stub.close();
    }
  }
}
