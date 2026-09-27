import api, { publicApi } from './api'
// Connexion et refresh passent par publicApi : un 401 (identifiants
// invalides) ne doit pas déclencher l'intercepteur de refresh.
export const connexion = async (email, password) => {
  const response = await publicApi.post('accounts/connexion/', {
    email,
    password,
  })

  return response.data
}

export const refreshToken = async (refresh) => {
  const response = await publicApi.post('accounts/refresh/', {
    refresh,
  })

  return response.data
}

export const logout = async (refresh) => {
  const response = await api.post('accounts/logout/', {
    refresh,
  })

  return response.data
}

export const activerCompte = async (token, password, passwordConfirm) => {
  const response = await publicApi.post('accounts/activation/', {
    token,
    password,
    password_confirm: passwordConfirm,
  })
  return response.data
}

export const demanderResetPassword = async (email) => {
  const response = await publicApi.post('accounts/password-reset/', {
    email,
  })
  return response.data
}

export const resetPassword = async (uid, token, password, passwordConfirm) => {
  const response = await publicApi.post(
    'accounts/password-reset/confirm/',
    {
      uid,
      token,
      password,
      password_confirm: passwordConfirm,
    }
  )
  return response.data
}


