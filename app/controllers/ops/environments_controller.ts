import type { HttpContext } from '@adonisjs/core/http'
import { readFile } from 'node:fs/promises'
import Environment from '#models/environment'
import {
  createFromUpload,
  createFromUrl,
  deleteEnvironment,
  EnvironmentError,
  listEnvironments,
  makeDefault,
  setThumbnail,
} from '#services/environment_service'
import { environmentUpdateValidator, environmentValidator } from '#validators/texture'

export default class EnvironmentsController {
  async index({ inertia, request }: HttpContext) {
    return inertia.render('ops/environments/index', {
      environments: await listEnvironments(),
      selected: Number(request.input('selected')) || null,
    })
  }

  /**
   * From an uploaded .hdr/.exr, or a link to one.
   */
  async store({ request, response, session }: HttpContext) {
    const { name, url } = await request.validateUsing(environmentValidator)
    const file = request.file('file', { size: '100mb', extnames: ['hdr', 'exr'] })

    try {
      let environment: Environment
      if (file) {
        if (!file.isValid) throw new EnvironmentError(file.errors.map((e) => e.message).join(', '))
        environment = await createFromUpload(name, new Uint8Array(await readFile(file.tmpPath!)))
      } else if (url) {
        environment = await createFromUrl(name, url)
      } else {
        throw new EnvironmentError('Upload a file or paste a link')
      }

      session.flash('notification', `${environment.name} added`)
      return response.redirect(`/ops/environments?selected=${environment.id}`)
    } catch (error) {
      if (!(error instanceof EnvironmentError)) throw error
      session.flashErrors({ file: error.message })
      session.flashExcept(['file'])
      return response.redirect().back()
    }
  }

  async update({ params, request, response }: HttpContext) {
    const environment = await Environment.findOrFail(params.id)
    const fields = await request.validateUsing(environmentUpdateValidator)

    if (fields.name !== undefined) environment.name = fields.name
    if (fields.sortOrder !== undefined) environment.sortOrder = fields.sortOrder
    await environment.save()
    if (fields.isDefault) await makeDefault(environment)

    return response.redirect().back()
  }

  async thumbnail({ params, request, response }: HttpContext) {
    const environment = await Environment.findOrFail(params.id)
    const file = request.file('image', { size: '10mb', extnames: ['png', 'jpg', 'jpeg', 'webp'] })
    if (!file || !file.isValid) return response.unprocessableEntity({ error: 'Send a PNG image' })

    try {
      await setThumbnail(environment, new Uint8Array(await readFile(file.tmpPath!)))
    } catch (error) {
      if (error instanceof EnvironmentError) {
        return response.unprocessableEntity({ error: error.message })
      }
      throw error
    }
    return { ok: true }
  }

  async destroy({ params, response, session }: HttpContext) {
    const environment = await Environment.findOrFail(params.id)
    await deleteEnvironment(environment)
    session.flash('notification', `${environment.name} deleted`)
    return response.redirect('/ops/environments')
  }
}
