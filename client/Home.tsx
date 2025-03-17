import { Flex, Box, Text, Button } from "@chakra-ui/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "./utils/trpc";
import { GarbageCollection } from "./GarbageCollection";

export function Home() {
  const queryClient = useQueryClient();
  const { mutate: logout } = useMutation(
    trpc.auth.logOut.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.auth.authStatus.queryKey(),
        });
      },
    })
  );

  return (
    <div>
      <Flex
        as="nav"
        justify="space-between"
        align="center"
        p={4}
        bg="gray.100"
        boxShadow="md"
      >
        <Text fontSize="lg" fontWeight="bold">
          rTorrent Garbage Collection
        </Text>
        <Button colorScheme="red" onClick={() => logout()}>
          Log Out
        </Button>
      </Flex>
      <Box p={4}>
        <GarbageCollection />
      </Box>
    </div>
  );
}
