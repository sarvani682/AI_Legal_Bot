import { v4 as uuidv4 } from 'uuid'

const API_URL = 'http://localhost:8000'

interface SignUpRequest {
  name: string
  email: string
  password: string
}

interface SignInRequest {
  email: string
  password: string
}

interface ChatMessage {
  sources: never[]
  role: string
  message: string
  timestamp: string
}

interface ChatSession {
  session_id: string
  created_at: string
}

const getAuthHeader = () => {
  const token = localStorage.getItem('token')
  if (!token) throw new Error('No authentication token found')
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

export const api = {
  auth: {
    signUp: async (data: SignUpRequest) => {
      const response = await fetch(`${API_URL}/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Signup failed')
      }
      const result = await response.json()
      localStorage.setItem('token', result.access_token)
      return result
    },

    signIn: async (data: SignInRequest) => {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Login failed')
      }
      const result = await response.json()
      localStorage.setItem('token', result.access_token)
      return result
    },

    logout: () => {
      localStorage.removeItem('token')
      localStorage.removeItem('sessionId')
    },
  },

  chat: {
    startSession: async () => {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('User not logged in')
      }

      try {
        const response = await fetch(`${API_URL}/start_session`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.detail || 'Failed to start session')
        }

        const result = await response.json()
        localStorage.setItem('sessionId', result.session_id)
        return result
      } catch (error) {
        console.error('Failed to start session:', error)
        throw error
      }
    },

    sendMessage: async (message: string, sessionId: string) => {
      if (!sessionId) throw new Error('No active chat session')
    
      const response = await fetch(`${API_URL}/send_message/${sessionId}`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify({ message }),
      })
    
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to send message')
      }
    
      return response.json()
    },    
    

    getChatHistory: async (sessionId: string) => {
      const response = await fetch(`${API_URL}/get_chat/${sessionId}`, {
        headers: getAuthHeader(),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to get chat history')
      }
      return response.json() as Promise<ChatMessage[]>
    }
    ,


    getUserSessions: async () => {
      const response = await fetch(`${API_URL}/get_sessions`, {
        headers: getAuthHeader(),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to get user sessions')
      }
      return response.json() as Promise<ChatSession[]>
    },

    // **New API for Document Upload**

    sendMessageWithDocument: async (message: string, sessionId: string, file?: File) => {
      if (!sessionId) throw new Error('No active chat session')
    
      const formData = new FormData()
      formData.append('message', message)
      if (file) {
        formData.append('file', file)
      }
    
      const token = localStorage.getItem('token')
      if (!token) throw new Error('No authentication token found')
    
      const response = await fetch(`${API_URL}/send_message_with_optional_document/${sessionId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Do NOT set 'Content-Type' explicitly here — fetch will set it automatically for multipart requests
        },
        body: formData,
      })
    
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to send message with document')
      }
    
      return response.json()
    },
    
    uploadDocument: async (sessionId: string, formData: FormData) => {
      if (!sessionId) throw new Error('No active chat session')
    
        const token = localStorage.getItem('token'); 
        if (!token) throw new Error('No authentication token found');
  
        const response = await fetch(`${API_URL}/upload_document/${sessionId}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
          body: formData,
        });
    
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to upload document')
      }
    
      return response.json()
    },
    

  },
} 


