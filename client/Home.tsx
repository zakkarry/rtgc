import { Flex, Box, Text, Button } from "@chakra-ui/react";
import {
  useColorMode,
  useColorModeValue,
  ColorModeButton,
} from "./ui/color-mode";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "./utils/trpc";
import { GarbageCollection } from "./GarbageCollection";
import { Boundary } from "./Boundary";

export function Home() {
  const queryClient = useQueryClient();
  const { colorMode } = useColorMode();

  // Use semantic tokens instead of direct color values
  const navBg = "bg.subtle";

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
        bg={navBg}
        boxShadow="sm"
      >
        <Text fontSize="lg" fontWeight="bold">
          rTorrent Garbage Collection
        </Text>
        <Flex gap={2} align="center">
          <ColorModeButton />
          <Button colorScheme="danger" onClick={() => logout()}>
            Log Out
          </Button>
        </Flex>
      </Flex>
      <Box p={4}>
        <Boundary>
          <GarbageCollection />
        </Boundary>
      </Box>
    </div>
  );
}
