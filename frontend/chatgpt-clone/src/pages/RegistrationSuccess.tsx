import { Box, Heading, Text, Button, VStack } from '@chakra-ui/react'
import { useNavigate } from 'react-router-dom'

const RegistrationSuccess = () => {
  const navigate = useNavigate()

  return (
    <Box
      w="100%"
      h="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      bg="gray.50"
    >
      <Box
        p={8}
        maxWidth="400px"
        borderWidth={1}
        borderRadius={8}
        boxShadow="lg"
        bg="white"
        textAlign="center"
      >
        <VStack spacing={6}>
          <Heading size="lg">Registration Successful!</Heading>
          <Text>Your account has been created. You can now log in and start chatting.</Text>
          <Button colorScheme="blue" onClick={() => navigate('/login')}>
            Go to Login
          </Button>
        </VStack>
      </Box>
    </Box>
  )
}

export default RegistrationSuccess
