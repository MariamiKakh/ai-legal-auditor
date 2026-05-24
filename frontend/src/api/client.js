import axios from 'axios'

let token = null

export function setToken(t) {
  token = t
}

export function clearToken() {
  token = null
}

export function getToken() {
  return token
}

const client = axios.create({
  baseURL: 'http://localhost:8000',
})

client.interceptors.request.use((config) => {
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default client
