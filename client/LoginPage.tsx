import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import React, { useCallback, useReducer } from "react";
import { trpc } from "./utils/trpc";
import {
  Button,
  Container,
  Heading,
  Input,
  VStack,
  Flex,
} from "@chakra-ui/react";

function useDOMState(initialState: string) {
  return useReducer(
    (_state: string, evt: React.ChangeEvent<HTMLInputElement>) =>
      evt.target.value,
    initialState
  );
}

export default function LoginPage() {
  const { data: authStatus } = useSuspenseQuery(trpc.authStatus.queryOptions());
  const { mutate: login } = useMutation(trpc.logIn.mutationOptions());

  const [username, setUsername] = useDOMState("");
  const [password, setPassword] = useDOMState("");

  const handleSubmit = useCallback(
    (evt: React.FormEvent<HTMLFormElement>) => {
      evt.preventDefault();
      login({ username, password });
    },
    [login, password, username]
  );

  return (
    <Flex minH="100vh" bg="gray.50" align="center" justify="center">
      <Container maxW="sm">
        <VStack spacing={8} mx="auto" maxW="md" py={12}>
          <Heading>{authStatus.userExists ? "Log in" : "Sign up"}</Heading>

          <form style={{ width: "100%" }} onSubmit={handleSubmit}>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel htmlFor="username-input">Username</FormLabel>
                <Input
                  id="username-input"
                  value={username}
                  onChange={setUsername}
                />
              </FormControl>

              <FormControl>
                <FormLabel htmlFor="password-input">Password</FormLabel>
                <Input
                  type="password"
                  id="password-input"
                  value={password}
                  onChange={setPassword}
                />
              </FormControl>

              <Button type="submit" colorScheme="green" width="100%">
                Log in
              </Button>
            </VStack>
          </form>
        </VStack>
      </Container>
    </Flex>
  );
}
