import { Button, Field, Heading, Input, VStack, Text } from "@chakra-ui/react";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import React, { useReducer } from "react";
import { trpc } from "./utils/trpc";

function useDOMState(initialState: string) {
  return useReducer(
    (_state: string, evt: React.ChangeEvent<HTMLInputElement>) =>
      evt.target.value,
    initialState
  );
}

export default function LoginPage({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [username, setUsername] = useDOMState("");
  const [password, setPassword] = useDOMState("");
  const { data: authStatus } = useSuspenseQuery(
    trpc.auth.authStatus.queryOptions()
  );
  const { mutate: login, error } = useMutation(
    trpc.auth.logIn.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.auth.authStatus.queryKey(),
        });
      },
    })
  );

  function handleSubmit(evt: React.FormEvent<HTMLFormElement>) {
    evt.preventDefault();
    login({ username, password });
  }

  if (authStatus.isLoggedIn) {
    return children;
  }

  return (
    <form onSubmit={handleSubmit}>
      <VStack
        align="stretch"
        maxW="md"
        mx="auto"
        mt={8}
        p={6}
        borderWidth={1}
        borderRadius="lg"
        boxShadow="lg"
      >
        <Heading size="lg" textAlign="center">
          {authStatus.userExists ? "Log in" : "Sign up"}
        </Heading>
        {error && <Text color="red">Incorrect username or password.</Text>}
        <Field.Root>
          <Field.Label>Username</Field.Label>
          <Field.RequiredIndicator />
          <Input
            type="text"
            value={username}
            onChange={setUsername}
            placeholder="Enter username"
          />
        </Field.Root>
        <Field.Root>
          <Field.Label>Password</Field.Label>
          <Field.RequiredIndicator />
          <Input
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="Enter password"
          />
        </Field.Root>
        <Button type="submit" colorScheme="blue" size="lg" width="full">
          {authStatus.userExists ? "Log in" : "Sign up"}
        </Button>
      </VStack>
    </form>
  );
}
