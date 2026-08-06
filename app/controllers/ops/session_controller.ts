import type { HttpContext } from '@adonisjs/core/http'
import { errors as authErrors } from '@adonisjs/auth'
import User from '#models/user'
import { loginValidator } from '#validators/auth'

export default class SessionController {
  async create({ inertia }: HttpContext) {
    return inertia.render('ops/login')
  }

  async store({ request, response, auth, session }: HttpContext) {
    const { email, password } = await request.validateUsing(loginValidator)

    try {
      const user = await User.verifyCredentials(email, password)
      await auth.use('web').login(user)
    } catch (error) {
      if (error instanceof authErrors.E_INVALID_CREDENTIALS) {
        session.flashErrors({ email: 'Those credentials are not valid' })
        session.flashAll()
        return response.redirect().back()
      }

      throw error
    }

    return response.redirect('/ops')
  }

  async destroy({ response, auth }: HttpContext) {
    await auth.use('web').logout()

    return response.redirect('/ops/login')
  }
}
