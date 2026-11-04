import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export interface AppConfig {
  port: number;
  nodeEnv: string;
  mongoUri: string;
  clientOrigin: string;
  jwtSecret: string;
  jwtExpiresIn: string;
}

export const validateConfig = (cfg: AppConfig): void => {
  if (cfg.nodeEnv === 'production') {
    if (
      !cfg.jwtSecret ||
      cfg.jwtSecret === 'fallback_development_secret_do_not_use_in_prod' ||
      cfg.jwtSecret.length < 32
    ) {
      throw new Error(
        '[FATAL CONFIGURATION ERROR] In production, JWT_SECRET must be set to a secure secret of at least 32 characters.'
      );
    }
    if (!cfg.mongoUri) {
      throw new Error(
        '[FATAL CONFIGURATION ERROR] In production, MONGODB_URI must be explicitly defined.'
      );
    }
    if (!process.env.CLIENT_ORIGIN) {
      console.warn(
        '[CONFIG WARNING] CLIENT_ORIGIN is not explicitly configured in production; defaulting to http://localhost:5173'
      );
    }
  }
};

const resolveConfig = (): AppConfig => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';

  const jwtSecret =
    process.env.JWT_SECRET ||
    (isProduction ? '' : 'fallback_development_secret_do_not_use_in_prod');

  const mongoUri =
    process.env.MONGODB_URI ||
    (isProduction ? '' : 'mongodb://localhost:27017/hotel_reservation_db');

  const cfg: AppConfig = {
    port: parseInt(process.env.PORT || '5000', 10),
    nodeEnv,
    mongoUri,
    clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    jwtSecret,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  };

  validateConfig(cfg);
  return cfg;
};

export const config: AppConfig = resolveConfig();

