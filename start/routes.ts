/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'

const HomeController = () => import('#controllers/home_controller')
const DocsController = () => import('#controllers/docs_controller')
const BlogController = () => import('#controllers/blog_controller')
const GalleryController = () => import('#controllers/gallery_controller')

router.get('/', [HomeController, 'show'])

router.get('/blog', [BlogController, 'index'])
router.get('/blog/:slug', [BlogController, 'show'])

router.get('/gallery', [GalleryController, 'index'])

router.get('/docs', [DocsController, 'show'])
router.get('/docs/*', [DocsController, 'show'])
