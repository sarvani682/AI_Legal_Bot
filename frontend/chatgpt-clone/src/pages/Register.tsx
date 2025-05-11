// import { useState } from 'react'
// import { useNavigate } from 'react-router-dom'
// import {
//   Box,
//   Button,
//   FormControl,
//   FormLabel,
//   Input,
//   VStack,
//   Heading,
//   Text,
//   useToast,
// } from '@chakra-ui/react'
// import { api } from '../services/api'

// interface RegisterProps {
//   setIsAuthenticated: (isAuthenticated: boolean) => void
// }

// const Register = ({ setIsAuthenticated }: RegisterProps) => {
//   const [name, setName] = useState('')
//   const [email, setEmail] = useState('')
//   const [password, setPassword] = useState('')
//   const [confirmPassword, setConfirmPassword] = useState('')
//   const [isLoading, setIsLoading] = useState(false)
//   const navigate = useNavigate()
//   const toast = useToast()

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault()
//     setIsLoading(true)

//     if (password !== confirmPassword) {
//       toast({
//         title: 'Error',
//         description: 'Passwords do not match',
//         status: 'error',
//         duration: 3000,
//         isClosable: true,
//       })
//       setIsLoading(false)
//       return
//     }

//     try {
//       const response = await api.auth.signUp({ name, email, password })
//       localStorage.setItem('token', response.access_token)
//       setIsAuthenticated(true)
//       navigate('/chat')
//     } catch (error) {
//       toast({
//         title: 'Registration failed',
//         description: error instanceof Error ? error.message : 'An error occurred',
//         status: 'error',
//         duration: 3000,
//         isClosable: true,
//       })
//     } finally {
//       setIsLoading(false)
//     }
//   }

//   return (
//     <Box
//       w="100%"
//       h="100vh"
//       display="flex"
//       alignItems="center"
//       justifyContent="center"
//       bg="gray.50"
//     >
//       <Box
//         p={8}
//         maxWidth="400px"
//         borderWidth={1}
//         borderRadius={8}
//         boxShadow="lg"
//         bg="white"
//       >
//         <VStack spacing={4} align="stretch">
//           <Heading textAlign="center">Register</Heading>
//           <form onSubmit={handleSubmit}>
//             <VStack spacing={4}>
//               <FormControl isRequired>
//                 <FormLabel>Name</FormLabel>
//                 <Input
//                   value={name}
//                   onChange={(e) => setName(e.target.value)}
//                 />
//               </FormControl>
//               <FormControl isRequired>
//                 <FormLabel>Email</FormLabel>
//                 <Input
//                   type="email"
//                   value={email}
//                   onChange={(e) => setEmail(e.target.value)}
//                 />
//               </FormControl>
//               <FormControl isRequired>
//                 <FormLabel>Password</FormLabel>
//                 <Input
//                   type="password"
//                   value={password}
//                   onChange={(e) => setPassword(e.target.value)}
//                 />
//               </FormControl>
//               <FormControl isRequired>
//                 <FormLabel>Confirm Password</FormLabel>
//                 <Input
//                   type="password"
//                   value={confirmPassword}
//                   onChange={(e) => setConfirmPassword(e.target.value)}
//                 />
//               </FormControl>
//               <Button
//                 type="submit"
//                 colorScheme="blue"
//                 width="full"
//                 isLoading={isLoading}
//               >
//                 Register
//               </Button>
//             </VStack>
//           </form>
//           <Text textAlign="center">
//             Already have an account?{' '}
//             <Button
//               variant="link"
//               colorScheme="blue"
//               onClick={() => navigate('/login')}
//             >
//               Login
//             </Button>
//           </Text>
//         </VStack>
//       </Box>
//     </Box>
//   )
// }

// export default Register 

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
  Heading,
  Text,
  useToast,
} from '@chakra-ui/react'
import { api } from '../services/api'

interface RegisterProps {
  setIsAuthenticated: (isAuthenticated: boolean) => void
}

const Register = ({ setIsAuthenticated }: RegisterProps) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })

  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const toast = useToast()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const { name, email, password, confirmPassword } = formData

    if (password !== confirmPassword) {
      toast({
        title: 'Error',
        description: 'Passwords do not match',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
      setIsLoading(false)
      return
    }

    try {
      const response = await api.auth.signUp({ name, email, password })
      localStorage.setItem('token', response.access_token)
      setIsAuthenticated(true)
      navigate('/registration-success')
    } catch (error) {
      toast({
        title: 'Registration failed',
        description: error instanceof Error ? error.message : 'An error occurred',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
    } finally {
      setIsLoading(false)
    }
  }

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
      >
        <VStack spacing={6} align="stretch">
          <Heading textAlign="center">Register</Heading>
          <form onSubmit={handleSubmit}>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Name</FormLabel>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Email</FormLabel>
                <Input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Password</FormLabel>
                <Input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Confirm Password</FormLabel>
                <Input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
              </FormControl>

              <Button
                type="submit"
                colorScheme="blue"
                width="full"
                isLoading={isLoading}
              >
                Register
              </Button>
            </VStack>
          </form>

          <Text textAlign="center">
            Already have an account?{' '}
            <Button
              variant="link"
              colorScheme="blue"
              onClick={() => navigate('/login')}
            >
              Login
            </Button>
          </Text>
        </VStack>
      </Box>
    </Box>
  )
}

export default Register
