/**
 * =====================================================================
 * CODE TRƯỚC KHI ÁP DỤNG — Repository (Mongoose Model)
 * =====================================================================
 * Vấn đề: route/service đụng collection thô, lẫn HTTP với chi tiết DB
 * =====================================================================
 */

export async function registerUserBeforePattern(db, payload) {
  const email = String(payload.email || '').trim().toLowerCase();
  const existing = await db.collection('users').findOne({ email });
  if (existing) {
    const err = new Error('Email is already in use.');
    err.status = 409;
    throw err;
  }

  const doc = {
    name: String(payload.name || '').trim(),
    email,
    passwordHash: payload.passwordHash,
    role: 'customer',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await db.collection('users').insertOne(doc);
  return { _id: result.insertedId, ...doc };
}

export async function listOrdersBeforePattern(db, userId) {
  const cursor = db
    .collection('orders')
    .find({ user: userId })
    .sort({ createdAt: -1 })
    .project({
      // tự select field thủ công khắp nơi
      status: 1,
      total: 1,
      paymentMethod: 1,
      createdAt: 1,
      items: 1,
      shipment: 1,
    });

  return cursor.toArray();
}

export async function createOrderBeforePattern(db, orderDraft) {
  // Trừ kho bằng update thô — dễ sai nếu quên transaction
  for (const line of orderDraft.items) {
    const product = await db.collection('products').findOne({ _id: line.product });
    if (!product || product.stock < line.quantity) {
      throw new Error('Không đủ tồn kho');
    }
    await db.collection('products').updateOne(
      { _id: line.product },
      { $inc: { stock: -line.quantity }, $set: { updatedAt: new Date() } },
    );
  }

  const result = await db.collection('orders').insertOne({
    ...orderDraft,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return { _id: result.insertedId, ...orderDraft };
}

export async function findProductBySlugBeforePattern(db, slug) {
  return db.collection('products').findOne({ slug, isActive: true, deletedAt: null });
}
