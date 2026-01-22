import mongoose from 'mongoose';

export async function runTransaction<T>(
  callback: (session: mongoose.ClientSession) => Promise<T>
): Promise<T> {
  const session = await mongoose.startSession();
  
  try {
    session.startTransaction();
    const result = await callback(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

export async function runTransactionSafe<T>(
  callback: (session: mongoose.ClientSession | null) => Promise<T>
): Promise<T> {
  try {
    return await runTransaction(callback);
  } catch (error: any) {
    if (error.message?.includes('Transaction') || error.codeName === 'NotImplemented') {
      console.warn('Transactions not supported, running without session');
      return await callback(null);
    }
    throw error;
  }
}
