import dns from 'dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);

import mongoose from 'mongoose';
import { config } from '../config/env.js';

const testAtlas = async (): Promise<void> => {
  console.log('--- Testing MongoDB Atlas Connection ---');
  console.log('Target URI (masked):', config.mongoUri.replace(/:([^@]+)@/, ':****@'));

  const conn = await mongoose.connect(config.mongoUri, {
    serverSelectionTimeoutMS: 8000,
  });
  console.log(`Connected to Atlas host: ${conn.connection.host}`);

  // 1. Check Hello / Replica Set Status
  const adminDb = conn.connection.db!.admin();
  const hello = await adminDb.command({ hello: 1 });
  console.log('Topology:', hello.setName ? `Replica Set [${hello.setName}]` : 'Standalone');
  console.log('Is Writable Primary:', hello.isWritablePrimary);

  // 2. Test Multi-Document ACID Transaction
  console.log('\n[Testing Multi-Document ACID Transaction]');
  const session = await mongoose.startSession();
  session.startTransaction();

  const testColl = conn.connection.db!.collection('test_concurrency');
  const txDocId = new mongoose.Types.ObjectId();
  await testColl.insertOne({ _id: txDocId, item: 'tx_verified', timestamp: new Date() }, { session });
  await session.commitTransaction();
  console.log(' - Transaction committed successfully!');

  // 3. Test Transaction Rollback
  console.log('\n[Testing Transaction Rollback]');
  session.startTransaction();
  const rollbackId = new mongoose.Types.ObjectId();
  await testColl.insertOne({ _id: rollbackId, item: 'should_be_aborted' }, { session });
  await session.abortTransaction();
  session.endSession();

  const found = await testColl.findOne({ _id: rollbackId });
  console.log(' - Aborted document found in DB:', !!found, '(Expected: false)');
  if (found) {
    throw new Error('Transaction abort failed! Uncommitted document was found in DB.');
  }
  console.log(' - Rollback verified 100% successful!');

  // Clean up
  await testColl.deleteOne({ _id: txDocId });
  await mongoose.connection.close();
  console.log('\n--- Atlas Verification Completed with 100% Success ---');
};

testAtlas().catch((err) => {
  console.error('\nAtlas test failed:', err);
  process.exit(1);
});
