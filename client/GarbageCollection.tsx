import {
  Badge,
  Box,
  Button,
  Flex,
  Heading,
  Text,
  Table,
  Checkbox,
} from "@chakra-ui/react";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useState } from "react";
import type { ProblemType, CleanupResult } from "../server/types";
import { Settings } from "./Settings";
import { trpc } from "./utils/trpc";
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogBackdrop,
} from "./ui/dialog";

function formatSize(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

function getProblemBadgeProps(type: ProblemType) {
  switch (type) {
    case "unregistered":
      return { colorScheme: "warning", children: "Unregistered" };
    case "orphaned":
      return { colorScheme: "danger", children: "Orphaned" };
    case "missingFiles":
      return { colorScheme: "warning", children: "Missing Files" };
    default:
      return { colorScheme: "gray", children: type };
  }
}

export function GarbageCollection() {
  const queryClient = useQueryClient();
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);

  const summaryBg = "bg.muted";
  const successBg = "success.50";
  const successColor = "success.700";
  const warningBg = "warning.50";
  const warningColor = "warning.700";

  const { data, refetch } = useSuspenseQuery(
    trpc.torrents.scanTorrents.queryOptions()
  );

  const cleanupMutation = useMutation(
    trpc.torrents.cleanupTorrents.mutationOptions({
      onSuccess: (result: CleanupResult) => {
        console.log("Cleanup successful", result);
        queryClient.invalidateQueries({
          queryKey: trpc.torrents.scanTorrents.queryKey(),
        });
        setSelectedPaths([]);
      },
      onError: (error) => {
        console.error("Cleanup failed", error);
      },
    })
  );

  const handleToggleSelect = (path: string) => {
    const selected = new Set(selectedPaths);
    selected.has(path) ? selected.delete(path) : selected.add(path);
    setSelectedPaths(Array.from(selected));
  };

  const handleSelectAll = () => {
    if (!data) return;
    if (selectedPaths.length === data.problemPaths.length) {
      setSelectedPaths([]);
    } else {
      setSelectedPaths(data.problemPaths.map((p) => p.path));
    }
  };

  const handleCleanup = () => {
    if (selectedPaths.length === 0) return;
    setShowConfirm(true);
  };

  const confirmCleanup = () => {
    setShowConfirm(false);
    cleanupMutation.mutate({ paths: selectedPaths });
  };

  const selectedSize = data
    ? data.problemPaths
        .filter((p) => selectedPaths.includes(p.path))
        .reduce((sum, p) => sum + p.size, 0)
    : 0;

  if (!data) {
    return (
      <Box p={4} bg={warningBg} color={warningColor} borderRadius="md">
        <Heading size="md" mb={2}>
          No Data
        </Heading>
        <Text>No data was returned from the server.</Text>
        <Button mt={4} onClick={() => refetch()} colorScheme="warning">
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Heading size="lg" mb={6}>
        Garbage Collection
      </Heading>
      <Flex mb={6} p={4} bg={summaryBg} borderRadius="md" gap={8}>
        <Box>
          <Text fontWeight="bold">Problem Paths</Text>
          <Text fontSize="2xl">{data.problemPaths.length}</Text>
          <Text fontSize="sm" opacity="0.8">
            {data.percentageOfTotalPaths.toFixed(2)}% of total paths
          </Text>
        </Box>
        <Box>
          <Text fontWeight="bold">Total Size</Text>
          <Text fontSize="2xl">{formatSize(data.totalSize)}</Text>
          <Text fontSize="sm" opacity="0.8">
            {data.percentageOfTotalSize.toFixed(2)}% of total size
          </Text>
        </Box>
        {selectedPaths.length > 0 && (
          <Box>
            <Text fontWeight="bold">Selected</Text>
            <Text fontSize="2xl">{selectedPaths.length} paths</Text>
            <Text fontSize="sm" opacity="0.8">
              {formatSize(selectedSize)}
            </Text>
          </Box>
        )}
      </Flex>
      <Flex justify="space-between" mb={4}>
        <Button onClick={() => refetch()} colorScheme="primary">
          Refresh
        </Button>
        <Flex gap={2}>
          <Button
            onClick={handleSelectAll}
            colorScheme="gray"
            disabled={data.problemPaths.length === 0}
          >
            {selectedPaths.length === data.problemPaths.length
              ? "Deselect All"
              : "Select All"}
          </Button>
          <Button
            onClick={handleCleanup}
            colorScheme="danger"
            disabled={selectedPaths.length === 0}
          >
            Clean Up Selected ({selectedPaths.length})
          </Button>
        </Flex>
      </Flex>
      {data.problemPaths.length === 0 ? (
        <Box p={4} bg={successBg} color={successColor} borderRadius="md">
          <Text>
            No problems found! Your torrents and filesystem are clean.
          </Text>
        </Box>
      ) : (
        <Box overflowX="auto">
          <Table.Root variant="line" size="md">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Select</Table.ColumnHeader>
                <Table.ColumnHeader>Type</Table.ColumnHeader>
                <Table.ColumnHeader>Path</Table.ColumnHeader>
                <Table.ColumnHeader>Size</Table.ColumnHeader>
                <Table.ColumnHeader>Last Modified</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {data.problemPaths.map((problem, index) => (
                <Table.Row
                  key={index}
                  onClick={() => handleToggleSelect(problem.path)}
                  cursor="pointer"
                  _hover={{ bg: "bg.subtle" }}
                >
                  <Table.Cell>
                    <Checkbox.Root
                      checked={selectedPaths.includes(problem.path)}
                      pointerEvents="none"
                    >
                      <Checkbox.Control />
                    </Checkbox.Root>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge {...getProblemBadgeProps(problem.type)} />
                  </Table.Cell>
                  <Table.Cell
                    maxW="xs"
                    textOverflow="ellipsis"
                    overflow="hidden"
                    whiteSpace="nowrap"
                    title={problem.path}
                  >
                    {problem.path}
                  </Table.Cell>
                  <Table.Cell>{formatSize(problem.size)}</Table.Cell>
                  <Table.Cell>
                    {new Date(problem.lastModified).toLocaleDateString("sv")}
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Box>
      )}
      {showConfirm && (
        <DialogRoot
          open={showConfirm}
          onOpenChange={({ open }) => setShowConfirm(open)}
        >
          <DialogBackdrop />
          <DialogContent>
            <DialogHeader>Confirm Cleanup</DialogHeader>
            <DialogBody>
              <Text>
                Are you sure you want to delete {selectedPaths.length} paths (
                {formatSize(selectedSize)})? This action cannot be undone.
              </Text>
            </DialogBody>
            <DialogFooter gap={2}>
              <Button onClick={() => setShowConfirm(false)}>Cancel</Button>
              <Button colorScheme="danger" onClick={confirmCleanup}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </DialogRoot>
      )}
    </Box>
  );
}
