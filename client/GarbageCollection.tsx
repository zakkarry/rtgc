import {
  Badge,
  Box,
  Button,
  Checkbox,
  Flex,
  Heading,
  NativeSelect,
  Table,
  Text,
} from "@chakra-ui/react";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useState, useMemo } from "react";
import type { CleanupResult, ProblemPath, ProblemType } from "../server/types";
import {
  DialogBackdrop,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
} from "./ui/dialog";
import { trpc } from "./utils/trpc";
import { TypeFilter } from "./components/TypeFilter";

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

export function GarbageCollection() {
  const queryClient = useQueryClient();
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<Set<ProblemType>>(
    new Set()
  );

  const summaryBg = "bg.muted";
  const successBg = "success.50";
  const successColor = "success.700";
  const warningBg = "warning.50";
  const warningColor = "warning.700";

  const { data: scanResults } = useSuspenseQuery(
    trpc.torrents.scanTorrents.queryOptions()
  );

  const { data: classifyResults } = useSuspenseQuery(
    trpc.torrents.classifyTorrents.queryOptions(scanResults.torrentPaths)
  );

  const allResults = [...classifyResults, ...scanResults.orphanedPaths];

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
    if (selectedPaths.length === filteredProblemPaths.length) {
      // Deselect only the filtered paths
      const filteredPathSet = new Set(
        filteredProblemPaths.map((p: ProblemPath) => p.path)
      );
      setSelectedPaths(
        selectedPaths.filter((path) => !filteredPathSet.has(path))
      );
    } else {
      // Select all filtered paths while keeping previously selected paths that aren't in the current filter
      const newSelectedPaths = new Set(selectedPaths);
      filteredProblemPaths.forEach((p: ProblemPath) =>
        newSelectedPaths.add(p.path)
      );
      setSelectedPaths(Array.from(newSelectedPaths));
    }
  };

  const handleCleanup = () => {
    if (selectedPaths.length === 0) return;
    setShowConfirm(true);
  };

  const handleConfirmCleanup = () => {
    cleanupMutation.mutate({ paths: selectedPaths });
    setShowConfirm(false);
  };

  const handleCancelCleanup = () => {
    setShowConfirm(false);
  };

  const filteredProblemPaths = useMemo(() => {
    return selectedTypes.size === 0
      ? allResults
      : allResults.filter((p: ProblemPath) => selectedTypes.has(p.type));
  }, [allResults, selectedTypes]);

  const selectedSize = useMemo(() => {
    return selectedPaths.reduce((sum, path) => {
      const problemPath = allResults.find((p: ProblemPath) => p.path === path);
      return sum + (problemPath?.size ?? 0);
    }, 0);
  }, [allResults, selectedPaths]);

  const handleRescan = () => {
    queryClient.invalidateQueries({
      queryKey: trpc.torrents.scanTorrents.queryKey(),
    });
  };

  const totalProblemSize = allResults.reduce(
    (sum, p: ProblemPath) => sum + p.size,
    0
  );

  return (
    <Box>
      <Heading size="lg" mb={6}>
        Garbage Collection
      </Heading>
      <Flex mb={6} p={4} bg={summaryBg} borderRadius="md" gap={8}>
        <Box>
          <Text fontWeight="bold">Problem Paths</Text>
          <Text fontSize="2xl">{allResults.length}</Text>
        </Box>
        <Box>
          <Text fontWeight="bold">Total Size</Text>
          <Text fontSize="2xl">{formatSize(totalProblemSize)}</Text>
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
        <Box>
          <Flex gap={2}>
            <Button onClick={handleRescan} colorScheme="primary">
              Refresh
            </Button>
            <TypeFilter
              selectedTypes={selectedTypes}
              onChange={setSelectedTypes}
            />
          </Flex>
        </Box>
        <Flex gap={2}>
          <Button
            onClick={handleSelectAll}
            colorScheme="gray"
            disabled={filteredProblemPaths.length === 0}
          >
            {selectedPaths.length === filteredProblemPaths.length &&
            filteredProblemPaths.every((p) => selectedPaths.includes(p.path))
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
      {filteredProblemPaths.length === 0 ? (
        <Box p={4} bg={successBg} color={successColor} borderRadius="md">
          <Text>
            {allResults.length === 0
              ? "No problems found! Your torrents and filesystem are clean."
              : "No problems match the selected filter."}
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
                <Table.ColumnHeader>Message</Table.ColumnHeader>
                <Table.ColumnHeader>Size</Table.ColumnHeader>
                <Table.ColumnHeader>Last Modified</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {filteredProblemPaths.map((problem, index) => (
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
                    <Badge>{problem.type}</Badge>
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
                  <Table.Cell>
                    {problem.torrentInfo?.message || "--"}
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
              <Button onClick={handleCancelCleanup}>Cancel</Button>
              <Button colorScheme="danger" onClick={handleConfirmCleanup}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </DialogRoot>
      )}
    </Box>
  );
}
