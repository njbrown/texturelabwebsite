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

const HomeController = () => import('#controllers/home_controller')
const DocsController = () => import('#controllers/docs_controller')
const BlogController = () => import('#controllers/blog_controller')
const GalleryController = () => import('#controllers/gallery_controller')
const ApiReleasesController = () => import('#controllers/api/releases_controller')
const DashboardController = () => import('#controllers/ops/dashboard_controller')
const OpsReleasesController = () => import('#controllers/ops/releases_controller')
const SessionController = () => import('#controllers/ops/session_controller')

/*
|--------------------------------------------------------------------------
| Public site
|--------------------------------------------------------------------------
*/
router.get('/', [HomeController, 'show'])

router.get('/blog', [BlogController, 'index'])
router.get('/blog/:slug', [BlogController, 'show'])

router.get('/gallery', [GalleryController, 'index'])

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
        router.post('/releases', [OpsReleasesController, 'store'])
        router.get('/releases/:id/edit', [OpsReleasesController, 'edit'])
        router.put('/releases/:id', [OpsReleasesController, 'update'])
        router.delete('/releases/:id', [OpsReleasesController, 'destroy'])
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
