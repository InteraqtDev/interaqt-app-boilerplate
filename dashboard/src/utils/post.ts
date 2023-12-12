import {PORT} from '../../../config.js'
const API_ADDR = `http://localhost:${PORT}`


export const post = async (url: string, data: any, userId?: string) => (await fetch(`${API_ADDR}${url}`, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId || ''
    },
    body: JSON.stringify(data)
})).json()