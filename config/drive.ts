import env from '#start/env'
import app from '@adonisjs/core/services/app'
import { defineConfig, services } from '@adonisjs/drive'

/**
 * Texture files, outputs and images. Locally this is MinIO (docker-compose.yml),
 * in production DigitalOcean Spaces; both speak S3.
 *
 * Objects under `public/` are readable by anyone: on MinIO through a bucket
 * policy on that prefix (S3_SUPPORTS_ACL=false), on Spaces through a
 * public-read ACL set per object. Everything else stays private and is served
 * through the app.
 */
const driveConfig = defineConfig({
  default: env.get('DRIVE_DISK', 's3'),

  services: {
    s3: services.s3({
      credentials: {
        accessKeyId: env.get('S3_ACCESS_KEY_ID', ''),
        secretAccessKey: env.get('S3_SECRET_ACCESS_KEY', ''),
      },
      region: env.get('S3_REGION', 'us-east-1'),
      bucket: env.get('S3_BUCKET', 'texturelab'),
      endpoint: env.get('S3_ENDPOINT'),
      forcePathStyle: env.get('S3_FORCE_PATH_STYLE', false),
      cdnUrl: env.get('S3_PUBLIC_URL'),
      supportsACL: env.get('S3_SUPPORTS_ACL', true),
      visibility: 'private',
    }),

    /**
     * Used by the test suite, and handy without docker. Files are served by
     * the app under /storage.
     */
    fs: services.fs({
      location: app.tmpPath('storage'),
      serveFiles: true,
      routeBasePath: '/storage',
      visibility: 'private',
    }),
  },
})

export default driveConfig

declare module '@adonisjs/drive/types' {
  export interface DriveDisks extends InferDriveDisks<typeof driveConfig> {}
}
