import {
  Box,
  Button,
  Heading,
  Spinner,
  Text,
  Flex,
  Badge,
} from "@chakra-ui/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type ProblemType, type ProblemPath } from "../server/types";
import { trpc } from "./utils/trpc";
import { useState, useRef } from "react";

// Helper function to format file sizes
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

// Helper function to get badge color based on problem type
function getProblemBadgeProps(type: ProblemType) {
  switch (type) {
    case "unregistered":
      return { colorScheme: "yellow", children: "Unregistered" };
    case "orphaned":
      return { colorScheme: "red", children: "Orphaned" };
    case "missingFiles":
      return { colorScheme: "orange", children: "Missing Files" };
    default:
      return { colorScheme: "gray", children: type };
  }
}

export function GarbageCollection() {
  const queryClient = useQueryClient();
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);

  // Use TanStack Query with TRPC
  const { data, isLoading, isError, error, refetch } = useQuery(
    trpc.scanTorrents.queryOptions()
  );

  // Mutation for cleanup
  const cleanupMutation = useMutation(
    trpc.cleanupTorrents.mutationOptions({
      onSuccess: (result) => {
        // Show success message
        console.log("Cleanup successful", result);
        queryClient.invalidateQueries({
          queryKey: trpc.scanTorrents.queryKey(),
        });
        setSelectedPaths([]);
      },
      onError: (error) => {
        // Show error message
        console.error("Cleanup failed", error);
      },
    })
  );

  const handleToggleSelect = (path: string) => {
    setSelectedPaths((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    );
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

  if (isLoading || cleanupMutation.isPending) {
    return (
      <Flex justify="center" align="center" height="300px" direction="column">
        <Spinner size="xl" mb={4} />
        <Text>
          {cleanupMutation.isPending
            ? "Cleaning up selected paths..."
            : "Scanning torrents and filesystem..."}
        </Text>
      </Flex>
    );
  }

  if (isError) {
    return (
      <Box p={4} bg="red.50" borderRadius="md">
        <Heading size="md" color="red.500" mb={2}>
          Error
        </Heading>
        <Text>{error?.message || "An unknown error occurred"}</Text>
        <Button mt={4} onClick={() => refetch()} colorScheme="red">
          Retry
        </Button>
      </Box>
    );
  }

  if (!data) {
    return (
      <Box p={4} bg="yellow.50" borderRadius="md">
        <Heading size="md" color="yellow.500" mb={2}>
          No Data
        </Heading>
        <Text>No data was returned from the server.</Text>
        <Button mt={4} onClick={() => refetch()} colorScheme="yellow">
          Retry
        </Button>
      </Box>
    );
  }

  const selectedSize = data.problemPaths
    .filter((p) => selectedPaths.includes(p.path))
    .reduce((sum, p) => sum + p.size, 0);

  return (
    <Box>
      <Heading size="lg" mb={6}>
        Garbage Collection
      </Heading>

      {/* Summary Statistics */}
      <Flex mb={6} p={4} bg="gray.50" borderRadius="md" gap={8}>
        <Box>
          <Text fontWeight="bold">Problem Paths</Text>
          <Text fontSize="2xl">{data.problemPaths.length}</Text>
          <Text fontSize="sm" color="gray.600">
            {data.percentageOfTotalPaths.toFixed(2)}% of total paths
          </Text>
        </Box>
        <Box>
          <Text fontWeight="bold">Total Size</Text>
          <Text fontSize="2xl">{formatSize(data.totalSize)}</Text>
          <Text fontSize="sm" color="gray.600">
            {data.percentageOfTotalSize.toFixed(2)}% of total size
          </Text>
        </Box>
        {selectedPaths.length > 0 && (
          <Box>
            <Text fontWeight="bold">Selected</Text>
            <Text fontSize="2xl">{selectedPaths.length} paths</Text>
            <Text fontSize="sm" color="gray.600">
              {formatSize(selectedSize)}
            </Text>
          </Box>
        )}
      </Flex>

      <Flex justify="space-between" mb={4}>
        <Button onClick={() => refetch()} colorScheme="blue">
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
            colorScheme="red"
            disabled={selectedPaths.length === 0}
          >
            Clean Up Selected ({selectedPaths.length})
          </Button>
        </Flex>
      </Flex>

      {/* Problem Paths Table */}
      {data.problemPaths.length === 0 ? (
        <Box p={4} bg="green.50" borderRadius="md">
          <Text>
            No problems found! Your torrents and filesystem are clean.
          </Text>
        </Box>
      ) : (
        <Box overflowX="auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Select
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Path
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Size
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Modified
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.problemPaths.map((problem, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedPaths.includes(problem.path)}
                      onChange={() => handleToggleSelect(problem.path)}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge {...getProblemBadgeProps(problem.type)} />
                  </td>
                  <td
                    className="px-6 py-4 whitespace-nowrap max-w-xs truncate"
                    title={problem.path}
                  >
                    {problem.path}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {formatSize(problem.size)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {new Date(problem.lastModified).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Box>
      )}

      {/* Confirmation Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium mb-4">Confirm Cleanup</h3>
            <p className="mb-4">
              Are you sure you want to delete {selectedPaths.length} paths (
              {formatSize(selectedSize)})? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button onClick={() => setShowConfirm(false)}>Cancel</Button>
              <Button colorScheme="red" onClick={confirmCleanup}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </Box>
  );
}
