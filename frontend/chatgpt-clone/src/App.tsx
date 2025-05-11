import { ChakraProvider, Box } from '@chakra-ui/react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Chat from './pages/Chat'
import DocumentChat from './pages/DocumentChat'
import Navbar from './components/Navbar'
import { useState } from 'react'
import RegistrationSuccess from './pages/RegistrationSuccess'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)


  return (
    <ChakraProvider>
      <Router>
        <Box minH="100vh" h="100vh" display="flex" flexDirection="column" bg="gray.50">
          {isAuthenticated && <Navbar setIsAuthenticated={setIsAuthenticated} />}
          <Box flex="1" overflow="auto">
            <Routes>
              <Route path="/login" element={<Login setIsAuthenticated={setIsAuthenticated} />} />
              <Route path="/register" element={<Register setIsAuthenticated={setIsAuthenticated} />} />
              <Route path="/registration-success" element={<RegistrationSuccess />} />  
              <Route path="/chat" element={isAuthenticated ? <Chat /> : <Navigate to="/login" />} />
              <Route path="/document-chat" element={isAuthenticated ? <DocumentChat /> : <Navigate to="/login" />} />
              <Route path="/" element={<Navigate to="/chat" />} />
            </Routes>
          </Box>
        </Box>
      </Router>
    </ChakraProvider>
  )
}

export default App
