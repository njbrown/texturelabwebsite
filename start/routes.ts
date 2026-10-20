/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

/**
 * Source files, fetched by the in-browser renderer and the download buttons.
 */
const textureFilesThrottle = middleware.throttle({
  name: 'texture_files',
  requests: 60,
  duration: '1 minute',
})

/**
 * Uploads in /ops. Generous: a render posts a batch of outputs and an image.
 */
const opsUploadsThrottle = middleware.throttle({
  name: 'ops_uploads',
  requests: 120,
  duration: '10 minutes',
  perUser: true,
})

const HomeController = () => import('#controllers/home_controller')
const DocsController = () => import('#controllers/docs_controller')
const BlogController = () => import('#controllers/blog_controller')
const GalleryController = () => import('#controllers/gallery_controller')
const TexturesController = () => import('#controllers/textures_controller')
const EnvironmentsController = () => import('#controllers/environments_controller')
const DownloadsController = () => import('#controllers/downloads_controller')
const ApiReleasesController = () => import('#controllers/api/releases_controller')
const DashboardController = () => import('#controllers/ops/dashboard_controller')
const OpsReleasesController = () => import('#controllers/ops/releases_controller')
const SessionController = () => import('#controllers/ops/session_controller')
const ApiTokensController = () => import('#controllers/ops/api_tokens_controller')
const ReleaseDraftsController = () => import('#controllers/api/release_drafts_controller')
const OpsTexturesController = () => import('#controllers/ops/textures_controller')
const OpsCategoriesController = () => import('#controllers/ops/texture_categories_controller')
const OpsEnvironmentsController = () => import('#controllers/ops/environments_controller')

/*
|--------------------------------------------------------------------------
| Public site
|--------------------------------------------------------------------------
*/
router.get('/', [HomeController, 'show'])

router.get('/blog', [BlogController, 'index'])
router.get('/blog/:slug', [BlogController, 'show'])

router.get('/gallery', [GalleryController, 'index'])
router.get('/gallery/:category', [GalleryController, 'index'])

router.get('/textures/:slug', [TexturesController, 'show'])
router.get('/textures/:slug/og.jpg', [TexturesController, 'ogImage'])
router.get('/textures/:slug/source', [TexturesController, 'source']).use(textureFilesThrottle)
router.get('/textures/:slug/download', [TexturesController, 'download']).use(textureFilesThrottle)
router.get('/environments/:id/file', [EnvironmentsController, 'file'])
router
  .get('/textures/:slug/outputs.zip', [TexturesController, 'downloadOutputs'])
  .use(textureFilesThrottle)

router.get('/download', [DownloadsController, 'index'])
router.get('/download/:identifier', [DownloadsController, 'show'])

/*
|--------------------------------------------------------------------------
| Public API — consumed by the desktop app
|--------------------------------------------------------------------------
*/
router
  .group(() => {
    router.get('/releases', [ApiReleasesController, 'index'])
    router.get('/releases/latest', [ApiReleasesController, 'latest'])
  })
  .prefix('/api')

/*
|--------------------------------------------------------------------------
| Ops API — called by CI with a token from /ops/tokens
|--------------------------------------------------------------------------
|
| Exempt from CSRF (config/shield.ts). Drafts only: publishing stays a
| person's job in /ops.
*/
router
  .post('/api/ops/releases/drafts', [ReleaseDraftsController, 'store'])
  .use(middleware.apiToken({ ability: 'releases:draft', requests: 30, duration: '1 hour' }))

/*
|--------------------------------------------------------------------------
| Admin (/ops)
|--------------------------------------------------------------------------
*/
router
  .group(() => {
    router.get('/login', [SessionController, 'create']).use(middleware.guest())
    router.post('/login', [SessionController, 'store']).use(middleware.guest())

    router
      .group(() => {
        router.post('/logout', [SessionController, 'destroy'])
        router.get('/', [DashboardController, 'index'])

        router.get('/releases', [OpsReleasesController, 'index'])
        router.get('/releases/create', [OpsReleasesController, 'create'])
        router.get('/releases/offer', [OpsReleasesController, 'offer'])
        router.post('/releases', [OpsReleasesController, 'store'])
        router.get('/releases/:id/edit', [OpsReleasesController, 'edit'])
        router.put('/releases/:id', [OpsReleasesController, 'update'])
        router.post('/releases/:id/publish', [OpsReleasesController, 'publish'])
        router.post('/releases/:id/unpublish', [OpsReleasesController, 'unpublish'])
        router.delete('/releases/:id', [OpsReleasesController, 'destroy'])

        router.get('/textures', [OpsTexturesController, 'index'])
        router.get('/textures/create', [OpsTexturesController, 'create'])
        router.post('/textures/inspect', [OpsTexturesController, 'inspect']).use(opsUploadsThrottle)
        router.post('/textures', [OpsTexturesController, 'store']).use(opsUploadsThrottle)
        router.get('/textures/:id/edit', [OpsTexturesController, 'edit'])
        router.put('/textures/:id', [OpsTexturesController, 'update'])
        router.delete('/textures/:id', [OpsTexturesController, 'destroy'])
        router
          .post('/textures/:id/source', [OpsTexturesController, 'replaceSource'])
          .use(opsUploadsThrottle)
        router.get('/textures/:id/source', [OpsTexturesController, 'source'])
        router
          .post('/textures/:id/outputs', [OpsTexturesController, 'storeOutputs'])
          .use(opsUploadsThrottle)
        router
          .post('/textures/:id/images', [OpsTexturesController, 'storeImage'])
          .use(opsUploadsThrottle)
        router.put('/textures/:id/images/order', [OpsTexturesController, 'reorderImages'])
        router.put('/textures/:id/images/:imageId', [OpsTexturesController, 'updateImage'])
        router.delete('/textures/:id/images/:imageId', [OpsTexturesController, 'destroyImage'])
        router.post('/textures/:id/publish', [OpsTexturesController, 'publish'])
        router.post('/textures/:id/unpublish', [OpsTexturesController, 'unpublish'])

        router.get('/categories', [OpsCategoriesController, 'index'])
        router.post('/categories', [OpsCategoriesController, 'store'])
        router.put('/categories/:id', [OpsCategoriesController, 'update'])
        router.delete('/categories/:id', [OpsCategoriesController, 'destroy'])

        router.get('/environments', [OpsEnvironmentsController, 'index'])
        router.post('/environments', [OpsEnvironmentsController, 'store']).use(opsUploadsThrottle)
        router.put('/environments/:id', [OpsEnvironmentsController, 'update'])
        router
          .post('/environments/:id/thumbnail', [OpsEnvironmentsController, 'thumbnail'])
          .use(opsUploadsThrottle)
        router.delete('/environments/:id', [OpsEnvironmentsController, 'destroy'])

        router.get('/tokens', [ApiTokensController, 'index'])
        router.post('/tokens', [ApiTokensController, 'store'])
        router.delete('/tokens/:id', [ApiTokensController, 'destroy'])
      })
      .use(middleware.auth())
  })
  .prefix('/ops')

/*
|--------------------------------------------------------------------------
| Docs — the wildcard is last so it never shadows another route
|--------------------------------------------------------------------------
*/
router.get('/docs', [DocsController, 'show'])
router.get('/docs/*', [DocsController, 'show'])
