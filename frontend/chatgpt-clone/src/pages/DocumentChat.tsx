import { useState, useRef, useEffect } from 'react'
import {
  Box,
  Input,
  Button,
  Text,
  Flex,
  InputGroup,
  InputRightElement,
  IconButton,
  useToast,
} from '@chakra-ui/react'
import { ChatIcon, AttachmentIcon } from '@chakra-ui/icons'

interface Message {
  role: 'user' | 'assistant'
  content: string
  file?: File
}

const API_URL = 'http://localhost:8001'

const DocumentChat = () => {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const toast = useToast()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setIsLoading(true)

      try {
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch(`${API_URL}/upload/`, {
          method: 'POST',
          body: formData,
          headers: {
            // Don't set Content-Type header, let the browser set it with boundary
          },
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to upload file')
        }

        const data = await response.json()
        toast({
          title: 'File uploaded successfully',
          status: 'success',
          duration: 3000,
          isClosable: true,
        })

        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `I've received your file: ${file.name}. You can now ask questions about its content.`,
          },
        ])
      } catch (error) {
        console.error('Upload error:', error)
        toast({
          title: 'Error uploading file',
          description: error instanceof Error ? error.message : 'Unknown error',
          status: 'error',
          duration: 3000,
          isClosable: true,
        })
      } finally {
        setIsLoading(false)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    const userMessage: Message = {
      role: 'user',
      content: input,
    }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const formData = new FormData()
      formData.append('question', input)

      const response = await fetch(`${API_URL}/ask/`, {
        method: 'POST',
        body: formData,
        headers: {
          // Don't set Content-Type header, let the browser set it with boundary
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to get answer')
      }

      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.answer,
        },
      ])
    } catch (error) {
      console.error('Ask error:', error)
      toast({
        title: 'Error getting answer',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Box h="100%" display="flex" flexDirection="column">
      <Box flex="1" overflowY="auto" p={4}>
        <Box>
          {messages.map((message, index) => (
            <Flex
              key={index}
              justify={message.role === 'user' ? 'flex-end' : 'flex-start'}
              mb={4}
            >
              <Flex
                maxW="70%"
                bg={message.role === 'user' ? 'blue.500' : 'white'}
                color={message.role === 'user' ? 'white' : 'inherit'}
                p={3}
                borderRadius="lg"
                borderWidth={message.role === 'user' ? 0 : 1}
                borderColor="gray.200"
              >
                {message.role === 'assistant' && (
                  <Box mr={2}>
                    <ChatIcon color="blue.500" />
                  </Box>
                )}
                <Box>
                  <Text>{message.content}</Text>
                  {message.file && (
                    <Text fontSize="sm" color="gray.500">
                      File: {message.file.name}
                    </Text>
                  )}
                </Box>
              </Flex>
            </Flex>
          ))}
          <div ref={messagesEndRef} />
        </Box>
      </Box>
      <Box
        p={4}
        borderTop="1px"
        borderColor="gray.200"
        bg="white"
      >
        <form onSubmit={handleSubmit}>
          <Box>
            <InputGroup>
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message or upload a file..."
                pr="4.5rem"
                isDisabled={isLoading}
              />
              <InputRightElement>
                <IconButton
                  aria-label="Upload file"
                  icon={<AttachmentIcon />}
                  onClick={() => fileInputRef.current?.click()}
                  variant="ghost"
                  isDisabled={isLoading}
                />
              </InputRightElement>
            </InputGroup>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              style={{ display: 'none' }}
              accept=".txt,.pdf,.docx"
            />
            <Button
              type="submit"
              colorScheme="blue"
              width="full"
              mt={2}
              isLoading={isLoading}
            >
              Send
            </Button>
          </Box>
        </form>
      </Box>
    </Box>
  )
}

export default DocumentChat 