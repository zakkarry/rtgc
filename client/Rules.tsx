import {
  Box,
  Button,
  Flex,
  Input,
  Text,
  VStack,
  IconButton,
} from "@chakra-ui/react";
import { NativeSelect } from "@chakra-ui/react";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { FiTrash2 } from "react-icons/fi";
import { trpc } from "./utils/trpc";
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import type { Rule } from "../server/types";

const PROBLEM_TYPES = [
  "healthy",
  "unregistered",
  "orphaned",
  "missingFiles",
  "unknown",
  "timeout",
] as const;

export function Rules() {
  const [open, setOpen] = useState(false);
  const [rules, setRules] = useState<Rule[]>([]);
  const [newSubstring, setNewSubstring] = useState("");
  const [newType, setNewType] =
    useState<(typeof PROBLEM_TYPES)[number]>("unknown");
  const queryClient = useQueryClient();

  const { data } = useSuspenseQuery(trpc.rules.getRules.queryOptions());

  useEffect(() => {
    if (data) {
      setRules(data);
    }
  }, [data]);

  const updateRulesMutation = useMutation(
    trpc.rules.updateRules.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.rules.getRules.queryKey(),
        });
        setNewSubstring("");
        setNewType("unknown");
      },
    })
  );

  const handleAddRule = () => {
    if (!newSubstring) return;
    const newRule: Rule = {
      matchType: "substring",
      substring: newSubstring,
      type: newType,
    };
    updateRulesMutation.mutate([...rules, newRule]);
  };

  const handleDeleteRule = (index: number) => {
    const newRules = [...rules];
    newRules.splice(index, 1);
    updateRulesMutation.mutate(newRules);
  };

  const handleOpenChange = (details: { open: boolean }) => {
    setOpen(details.open);
  };

  return (
    <DialogRoot open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" colorScheme="gray" variant="outline">
          Rules
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rules</DialogTitle>
        </DialogHeader>

        <DialogBody>
          <VStack gap={4} align="stretch">
            <Box>
              <Text fontWeight="bold" mb={2}>
                Current Rules
              </Text>
              <VStack gap={2} align="stretch">
                {rules.map((rule, index) => (
                  <Flex
                    key={index}
                    p={2}
                    bg="bg.muted"
                    borderRadius="md"
                    justify="space-between"
                    align="center"
                  >
                    <Box>
                      <Text>
                        Match: <code>{rule.substring}</code>
                      </Text>
                      <Text fontSize="sm" color="text.subtle">
                        Type: {rule.type}
                      </Text>
                    </Box>
                    <IconButton
                      aria-label="Delete rule"
                      size="sm"
                      variant="ghost"
                      colorScheme="danger"
                      onClick={() => handleDeleteRule(index)}
                    >
                      <FiTrash2 />
                    </IconButton>
                  </Flex>
                ))}
              </VStack>
            </Box>

            <Box>
              <Text fontWeight="bold" mb={2}>
                Add New Rule
              </Text>
              <VStack gap={2}>
                <Input
                  value={newSubstring}
                  onChange={(e) => setNewSubstring(e.target.value)}
                  placeholder="Enter substring to match"
                />
                <NativeSelect.Root>
                  <NativeSelect.Field
                    value={newType}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      setNewType(
                        e.target.value as (typeof PROBLEM_TYPES)[number]
                      )
                    }
                  >
                    {PROBLEM_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
                <Button
                  width="full"
                  onClick={handleAddRule}
                  disabled={!newSubstring}
                >
                  Add Rule
                </Button>
              </VStack>
            </Box>
          </VStack>
        </DialogBody>

        <DialogFooter>
          <Button onClick={() => setOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
}
