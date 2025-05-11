import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import {
  Box,
  Button,
  Flex,
  useToast,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton,
  Input,
  Tooltip,
  Text,
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerCloseButton,
} from '@chakra-ui/react';
import { ChatIcon, ChevronDownIcon, AttachmentIcon, HamburgerIcon } from '@chakra-ui/icons';
import { FaMicrophone, FaStop, FaPaperPlane } from 'react-icons/fa'; // Corrected import
import { api } from '../services/api';
import { X } from "lucide-react";

interface Message {
  role: 'user' | 'ai';
  content: string;
  // sources?: string[];
  sources?: Source[]; // This is the correct type
  attachedFile?: { name: string; type: string; size: string }; // Add attachedFile info
}

interface ChatSession {
  session_id: string;
  created_at: string;
}

interface Source {
  title: string;
  url: string;
}

// ChatInput Component (Modified to handle file state locally)
const ChatInput = ({
  input,
  setInput,
  handleSubmit,
  isLoading,
}: {
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  handleSubmit: (message: string, fileToSend: File | null) => Promise<void>; // Modified handleSubmit signature
  isLoading: boolean;
}) => {
  
  const [isRecording, setIsRecording] = useState(false);
  const [localFile, setLocalFile] = useState<File | null>(null);
  const recognitionRef = useRef<any>(null);

  const handleFileSelected = (file: File | null) => {
    setLocalFile(file);
  };

  const handleFileRemoved = () => {
    setLocalFile(null);
  };

  const startRecording = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert('Speech Recognition not supported in this browser.');
      return;
    }

    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput((prev) => prev + ' ' + transcript);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();
    recognitionRef.current = recognition;
    setIsRecording(true);
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(input, localFile); // Use localFile here
      setLocalFile(null); // Clear the local file after sending
    }
  };

  const handleSendButtonClick = () => {
    handleSubmit(input, localFile); // Use localFile here
    setLocalFile(null); // Clear the local file after sending
  };

  return (
    <Flex align="center" flex="1">
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Type your message or use mic..."
        isDisabled={isLoading}
        mr={2}
        size="lg"
        onKeyDown={handleKeyDown}
      />
      <Tooltip label={isRecording ? 'Stop recording' : 'Start recording'} placement="top">
        <IconButton
          aria-label={isRecording ? 'Stop recording' : 'Start recording'}
          icon={isRecording ? <FaStop /> : <FaMicrophone />}
          onClick={isRecording ? stopRecording : startRecording}
          colorScheme={isRecording ? 'red' : 'blue'}
          mr={2}
        />
      </Tooltip>
      <Tooltip label="Upload Document" placement="top">
        <IconButton
          icon={<AttachmentIcon />}
          onClick={() => document.getElementById('file-upload')?.click()}
          aria-label="Upload Document"
          mr={2}
        />
      </Tooltip>
      <input
        type="file"
        id="file-upload"
        accept="image/*,application/pdf"
        onChange={(e) => {
          const selectedFile = e.target.files?.[0];
          if (selectedFile) {
            setLocalFile(selectedFile);
          } else {
            setLocalFile(null);
          }
        }}
        style={{ display: 'none' }}
      />
      <Tooltip label="Send Message" placement="top">
        <IconButton
          aria-label="Send Message"
          onClick={handleSendButtonClick}
          colorScheme="blue"
          isLoading={isLoading}
          isDisabled={isLoading}
        >
          <FaPaperPlane />
        </IconButton>
      </Tooltip>
      {localFile && (
        <Box
          ml={2}
          fontSize="sm"
          border="1px solid black"
          borderRadius="md"
          p={1}
          display="flex"
          alignItems="center"
          bg="white"
        >
          <AttachmentIcon mr={1} color="black" />
          <Text as="span" mr={2}>
            Attached: {localFile.name} ({localFile.name.split(".").pop()?.toUpperCase()}, {(localFile.size / 1024).toFixed(2)} KB)
          </Text>
          <IconButton
            icon={<X size={12} />}
            size="sm"
            aria-label="Remove attachment"
            onClick={() => setLocalFile(null)}
            colorScheme="gray"
          />
        </Box>
      )}
    </Flex>
  );
};

const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const openHistory = () => setIsHistoryOpen(true);
  const closeHistory = () => setIsHistoryOpen(false);

  

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const toast = useToast();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const initializeChat = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const userSessions = await api.chat.getUserSessions();
      setSessions(userSessions);

      const newSession = await api.chat.startSession();
      setSelectedSession(newSession.session_id);
      localStorage.setItem('sessionId', newSession.session_id);

      const history = await api.chat.getChatHistory(newSession.session_id);
      setMessages(
        history.map((msg) => ({
          role: msg.role as 'user' | 'ai',
          content: msg.message,
          sources: msg.sources ? msg.sources.map((s: any) => ({ title: s.title, url: s.url })) : [], // Correct mapping

        })),
      );
    } catch (error) {
      if (error instanceof Error && error.message.includes('No authentication token')) {
        navigate('/login');
        return;
      }
      toast({
        title: 'Error initializing chat',
        description: error instanceof Error ? error.message : 'An error occurred',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  }, [navigate, toast]);

  useEffect(() => {
    initializeChat();
  }, [initializeChat]);

  const handleSubmit = useCallback(
    async (message: string, fileToSend: File | null) => {
      if (!message.trim() && !fileToSend) return; // Ensure either message or file is present

      const userMessage: Message = {
        role: 'user',
        content: message,
      };

      let finalMessages = [...messages];
      let messageToSend = message; // Initialize the message to be sent
      let attachedFileInfo: Message['attachedFile'] | undefined;

      if (fileToSend) {
        const fileType = fileToSend.name.split('.').pop()?.toUpperCase();
        const fileSizeKB = (fileToSend.size / 1024).toFixed(2);
        attachedFileInfo = { name: fileToSend.name, type: fileType || '', size: fileSizeKB + ' KB' };
        userMessage.attachedFile = attachedFileInfo; // Store file info in the message
        messageToSend = `${message.trim() ? message + ' ' : ''}Uploaded document: ${fileToSend.name}`;
      }

      if (message.trim() || fileToSend) {
        finalMessages.push(userMessage);
      }
      setMessages(finalMessages);
      setInput('');
      setIsLoading(true);

      try {
        const aiResponse = await api.chat.sendMessageWithDocument(
          messageToSend,
          selectedSession!,
          fileToSend === null ? undefined : fileToSend
        );

        const aiMessage: Message = {
          role: 'ai',
          content: aiResponse.ai_response,
          // sources: aiResponse.sources,
          sources: aiResponse.sources ? aiResponse.sources.map((s: any) => ({ title: s.title, url: s.url })) : [], // Correct mapping

          
        };

        setMessages((prev) => [...prev, aiMessage]);
      } catch (error) {
        if (error instanceof Error && error.message.includes('No authentication token')) {
          navigate('/login');
          return;
        }
        toast({
          title: 'Error sending message',
          description: error instanceof Error ? error.message : 'An error occurred',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [messages, selectedSession, navigate, toast],
  );

  const handleNewSession = useCallback(async () => {
    try {
      const newSession = await api.chat.startSession();
      setSelectedSession(newSession.session_id);
      localStorage.setItem('sessionId', newSession.session_id);
      setMessages([]);
      toast({
        title: 'New chat session started',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Error starting new session',
        description: error instanceof Error ? error.message : 'An error occurred',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  }, [toast]);

  const handleLogout = () => {
    api.auth.logout();
    navigate('/login');
  };

  return (
    <Box h="100%" display="flex" flexDirection="column">
      <Box p={4} borderBottom="1px" borderColor="gray.200" bg="white">
        <Flex justify="space-between" align="center">
         <IconButton
  aria-label="Open chat history"
   icon={<HamburgerIcon />}
  variant="outline"
  onClick={openHistory}
/>
        </Flex>
      </Box>

      <Drawer isOpen={isHistoryOpen} placement="left" onClose={closeHistory}>
  <DrawerOverlay />
  <DrawerContent>
    <DrawerCloseButton />
    <DrawerHeader>Chat History</DrawerHeader>
    <DrawerBody>
      <Button
        w="100%"
        mb={2}
        onClick={() => {
          handleNewSession();
          closeHistory();
        }}
      >
        + New Session
      </Button>

      {sessions.map((session) => (
        <Box
          key={session.session_id}
          p={2}
          mb={1}
          borderRadius="md"
          borderWidth={session.session_id === selectedSession ? '2px' : '1px'}
borderColor={session.session_id === selectedSession ? 'black' : 'transparent'}

          _hover={{ bg: 'gray.100', cursor: 'pointer' }}
          onClick={async () => {
            setSelectedSession(session.session_id);
            localStorage.setItem('sessionId', session.session_id);
            const history = await api.chat.getChatHistory(session.session_id);
            setMessages(
              history.map((msg) => ({
                role: msg.role as 'user' | 'ai',
                content: msg.message,
                sources: msg.sources ? msg.sources.map((s: any) => ({ title: s.title, url: s.url })) : [],

              }))
            );
            closeHistory();
          }}
        >
          Session {session.session_id.slice(0, 8)}...
        </Box>
      ))}
    </DrawerBody>
  </DrawerContent>
</Drawer>


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
                direction="column"
              >
                {message.role === 'ai' && (
                  <Box mb={2}>
                    <ChatIcon color="blue.500" />
                  </Box>
                )}
                <Box className="markdown-body">
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                </Box>

                {message.role === 'user' && message.attachedFile && (
                  <Box
                    mt={2}
                    p={1}
                    color="black"
                    bg="white"
                    border="1px solid black"
                    borderRadius="md"
                    fontSize="sm"
                  >
                    <Flex align="center" justify="space-between">
                      <Flex align="center">
                        <AttachmentIcon mr={1} color="black" />
                        <Text as="span">
                          {message.attachedFile.name} ({message.attachedFile.type}, {message.attachedFile.size})
                        </Text>
                      </Flex>
                      <IconButton
                        icon={<X size={12} />}
                        size="sm"
                        aria-label="Remove attachment"
                        onClick={() => {
                          const updatedMessages = messages.map((msg) =>
                            msg === message ? { ...msg, attachedFile: undefined } : msg
                          );
                          setMessages(updatedMessages);
                        }}
                        colorScheme="gray"
                      />
                    </Flex>
                  </Box>
                )}

                {message.role === 'ai' && message.sources && message.sources.length > 0 && (
                  <Box mt={2} fontSize="sm" color="gray.500">
                    Sources:
                    <Box as="ul" pl={4} mt={1}>
                      {message.sources.map((source: any, idx: number) => (
                        <Box as="li" key={idx}>
                          <span>{idx + 1}. </span>
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ textDecoration: 'underline', color: '#3182ce' }}
                          >
                            {source.title}
                          </a>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}
              </Flex>
            </Flex>
          ))}
          <div ref={messagesEndRef} />
        </Box>
      </Box>

      <Box p={4} borderTop="1px" borderColor="gray.200" bg="white">
        <ChatInput
          input={input}
          setInput={setInput}
          handleSubmit={handleSubmit} // handleSubmit now accepts the file
          isLoading={isLoading}
        />
      </Box>
    </Box>
  );
};

export default Chat;