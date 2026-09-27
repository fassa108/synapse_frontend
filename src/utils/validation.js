export const isRequired = (value) => {
  return value !== null && value !== undefined && String(value).trim() !== ''
}

export const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export const minLength = (value, length) => {
  return String(value).length >= length
}

export const maxLength = (value, length) => {
  return String(value).length <= length
}