import { useState, useRef } from 'react'
import { Input, Button, Box, Flex, IconButton } from '@chakra-ui/react'
import { FaMicrophone, FaStop } from 'react-icons/fa'
import { api } from '../services/api'

interface Message {
  role: 'user' | 'assistant'
  content: string
  sources?: string[]
}

interface ChatInputProps {
  input: string
  setInput: React.Dispatch<React.SetStateAction<string>>
  handleSubmit: (message: string) => Promise<void>
  isLoading: boolean
}

const ChatInput = ({ input, setInput, handleSubmit, isLoading }: ChatInputProps) => {
  const [isRecording, setIsRecording] = useState(false)
  const recognitionRef = useRef<any>(null)

  const startRecording = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert('Speech Recognition not supported in this browser.')
      return
    }

    const recognition = new (window as any).webkitSpeechRecognition()
    recognition.lang = 'en-US'
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setInput((prev) => prev + ' ' + transcript)
    }

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error)
    }

    recognition.onend = () => {
      setIsRecording(false)
    }

    recognition.start()
    recognitionRef.current = recognition
    setIsRecording(true)
  }

  const stopRecording = () => {
    recognitionRef.current?.stop()
    setIsRecording(false)
  }

  return (
    <Box p={4} borderTop="1px" borderColor="gray.200" bg="white">
      <Flex>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message or use mic..."
          isDisabled={isLoading}
          mr={2}
        />
        <IconButton
          aria-label={isRecording ? 'Stop recording' : 'Start recording'}
          icon={isRecording ? <FaStop /> : <FaMicrophone />}
          onClick={isRecording ? stopRecording : startRecording}
          colorScheme={isRecording ? 'red' : 'blue'}
          mr={2}
        />
        <Button
          onClick={() => handleSubmit(input)}
          colorScheme="blue"
          isLoading={isLoading}
        >
          Send
        </Button>
      </Flex>
    </Box>
  )
}

export default ChatInput
