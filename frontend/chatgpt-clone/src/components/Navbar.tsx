import { Box, Flex, Button, Text } from '@chakra-ui/react'
import { Link, useNavigate } from 'react-router-dom'
import { ChatIcon } from '@chakra-ui/icons'
import { FiFileText } from 'react-icons/fi'

interface NavbarProps {
  setIsAuthenticated: (value: boolean) => void
}

const Navbar = ({ setIsAuthenticated }: NavbarProps) => {
  const navigate = useNavigate()

  const handleLogout = () => {
    setIsAuthenticated(false)
    navigate('/login')
  }

  return (
    <Box bg="white" px={4} borderBottom="1px" borderColor="gray.200">
      <Flex h={16} alignItems="center" justifyContent="space-between">
        <Flex alignItems="center">
          <Text fontSize="xl" fontWeight="bold" mr={8}>
            Legal Bot
          </Text>
          {/* <Link to="/chat">
            <Button variant="ghost">
              <ChatIcon mr={2} />
              Chat
            </Button>
          </Link>
          <Link to="/document-chat">
            <Button variant="ghost">
              <FiFileText style={{ marginRight: '8px' }} />
              Document Chat
            </Button>
          </Link> */}
        </Flex>
        <Button colorScheme="red" onClick={handleLogout}>
          Logout
        </Button>
      </Flex>
    </Box>
  )
}

export default Navbar 