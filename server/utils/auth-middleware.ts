import { Request, Response, NextFunction } from 'express';
import { dbStorage } from '../db';
import { drivers } from '@shared/schema';
import { eq } from 'drizzle-orm';

export interface AuthenticatedRequest extends Request {
  driverId?: string;
  userType?: string;
}

/**
 * Middleware to require driver authentication
 * Extracts driverId from Bearer token
 */
export async function requireDriverAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'غير مصرح - الرجاء تسجيل الدخول'
      });
    }

    const token = authHeader.split(' ')[1];
    
    // In this implementation, the token is the driver.id (as seen in server/routes/auth.ts)
    const driverResult = await dbStorage.db
      .select()
      .from(drivers)
      .where(eq(drivers.id, token))
      .limit(1);

    if (driverResult.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'جلسة غير صالحة'
      });
    }

    const driver = driverResult[0];
    
    if (!driver.isActive) {
      return res.status(401).json({
        success: false,
        message: 'الحساب غير مفعل'
      });
    }

    // Attach driver information to request
    req.driverId = driver.id;
    req.userType = 'driver';
    
    next();
  } catch (error) {
    console.error('Driver authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في المصادقة'
    });
  }
}
